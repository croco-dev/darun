import { revalidatePath } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../auth/callback/route';
import { login, retryUserProfile, signup } from './actions';

const fixture = vi.hoisted(() => ({ cookies: new Map<string, string>() }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: 'http://localhost:3003' }),
  cookies: async () => ({
    getAll: () => [...fixture.cookies].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => fixture.cookies.set(name, value),
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

const user = {
  id: 'a9e42957-5596-4d12-a599-034cff66f475',
  email: 'profile@example.invalid',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2026-11-07T00:00:00Z',
  app_metadata: {},
  user_metadata: { is_admin: true },
  identities: [
    {
      identity_id: 'email-identity',
      id: 'email-identity',
      provider: 'email',
      user_id: 'a9e42957-5596-4d12-a599-034cff66f475',
    },
  ],
};
const jwt = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4_000_000_000 })).toString('base64url')}.fixture`;
const session = { access_token: jwt, refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user };
const rows = new Map<string, { id: string; email: string; is_admin: boolean }>();
let databaseFails = false;
let authFails = false;
let signupHasSession = false;
let signupUser: typeof user | null;
const requests: { path: string; method: string; body: Record<string, unknown>; headers: Headers }[] = [];

function form() {
  const data = new FormData();
  data.set('email', user.email);
  data.set('password', 'fixture-password');
  data.set('id', 'attacker-supplied-id');
  data.set('is_admin', 'true');
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:4475');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'fixture-public-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-service-role');
  fixture.cookies.clear();
  rows.clear();
  requests.length = 0;
  databaseFails = false;
  authFails = false;
  signupHasSession = false;
  signupUser = user;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.origin !== 'http://127.0.0.1:4475') throw new Error('Unexpected external request');
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const headers = new Headers(init?.headers);
    requests.push({ path: url.pathname, method: init?.method ?? 'GET', body, headers });
    const json = (value: unknown, status = 200) => Response.json(value, { status });
    if (url.pathname.startsWith('/auth/')) {
      if (authFails) return json({ msg: 'fixture authentication failure', code: 'invalid_credentials' }, 400);
      if (url.pathname.endsWith('/signup')) return json(signupHasSession ? session : { user: signupUser });
      if (url.pathname.endsWith('/token')) return json(session);
      if (url.pathname.endsWith('/user')) return json(user);
    }
    if (url.pathname === '/rest/v1/users' && init?.method === 'POST') {
      if (databaseFails) return json({ code: 'fixture-unavailable', message: 'private database detail' }, 503);
      const id = String(body.id);
      const existing = rows.get(id);
      const ignore = headers.get('prefer')?.includes('resolution=ignore-duplicates');
      if (existing && !ignore) return json({ code: '23505', message: 'duplicate ID' }, 409);
      if (!existing) rows.set(id, { id, email: String(body.email), is_admin: Boolean(body.is_admin) });
      return new Response(null, { status: 201 });
    }
    throw new Error(`Unexpected fixture request: ${url.pathname}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('authentication and application profile recovery', () => {
  it('reports partial signup instead of success when profile storage fails', async () => {
    databaseFails = true;
    await expect(signup({}, form())).rejects.toThrow('redirect:/auth/profile-sync');
    expect(rows.size).toBe(0);
    expect(requests.filter(request => request.path.endsWith('/signup'))).toHaveLength(1);
  });

  it('repairs a missing profile on password login using the provider UID and no client role claims', async () => {
    await expect(login({}, form())).rejects.toThrow('redirect:/');
    expect([...rows.values()]).toEqual([{ id: user.id, email: user.email, is_admin: false }]);
    const write = requests.find(request => request.path === '/rest/v1/users')!;
    expect(write.headers.get('authorization')).toBe('Bearer fixture-service-role');
    expect(write.headers.get('prefer')).toContain('resolution=ignore-duplicates');
    expect(write.body).toEqual({ id: user.id, email: user.email });
  });

  it('retries only profile storage for the authenticated UID after partial signup', async () => {
    signupHasSession = true;
    databaseFails = true;
    await expect(signup({}, form())).rejects.toThrow('redirect:/auth/profile-sync');
    await expect(retryUserProfile()).resolves.toHaveProperty('error');
    databaseFails = false;
    await expect(retryUserProfile()).rejects.toThrow('redirect:/');
    await expect(retryUserProfile()).rejects.toThrow('redirect:/');
    expect([...rows.values()]).toEqual([{ id: user.id, email: user.email, is_admin: false }]);
    expect(requests.filter(request => request.path.endsWith('/signup'))).toHaveLength(1);
    expect(requests.filter(request => request.path.endsWith('/token'))).toHaveLength(0);
  });

  it('requires email confirmation and login for a signup without a session, without creating another account', async () => {
    databaseFails = true;
    await expect(signup({}, form())).rejects.toThrow('redirect:/auth/profile-sync');
    databaseFails = false;
    expect(await retryUserProfile()).toHaveProperty('error');
    expect(rows.size).toBe(0);
    expect(requests.filter(request => request.path.endsWith('/signup'))).toHaveLength(1);
  });

  it('stores a genuine signup profile and keeps the email confirmation message', async () => {
    expect(await signup({}, form())).toHaveProperty('message');
    expect([...rows.values()]).toEqual([{ id: user.id, email: user.email, is_admin: false }]);
  });

  it('does not continue into the app when login profile storage fails', async () => {
    databaseFails = true;
    await expect(login({}, form())).rejects.toThrow('redirect:/auth/profile-sync');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('preserves an existing administrator row on repeated login', async () => {
    const original = { id: user.id, email: 'original@example.invalid', is_admin: true };
    rows.set(user.id, original);
    await expect(login({}, form())).rejects.toThrow('redirect:/');
    await expect(login({}, form())).rejects.toThrow('redirect:/');
    expect([...rows.values()]).toEqual([original]);
  });

  it('sends callback partial failure to recovery and repairs it on a later login', async () => {
    databaseFails = true;
    const response = await GET(new Request('http://localhost:3003/auth/callback?code=fixture-code'));
    expect(response.headers.get('location')).toBe('http://localhost:3003/auth/profile-sync');
    databaseFails = false;
    await expect(login({}, form())).rejects.toThrow('redirect:/');
    expect([...rows.values()]).toEqual([{ id: user.id, email: user.email, is_admin: false }]);
  });

  it('creates the missing callback profile before continuing to its safe destination', async () => {
    const response = await GET(new Request('http://localhost:3003/auth/callback?code=fixture-code&next=/apps?page=2'));
    expect(response.headers.get('location')).toBe('http://localhost:3003/apps?page=2');
    expect(rows.has(user.id)).toBe(true);
  });

  it('does not write a profile after rejected authentication', async () => {
    authFails = true;
    expect(await signup({}, form())).toHaveProperty('error');
    expect(await login({}, form())).toHaveProperty('error');
    const response = await GET(new Request('http://localhost:3003/auth/callback?code=invalid'));
    expect(response.headers.get('location')).toBe('http://localhost:3003/auth/auth-code-error');
    expect(requests.filter(request => request.path === '/rest/v1/users')).toHaveLength(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('does not create a profile from an obfuscated duplicate-signup response', async () => {
    signupUser = { ...user, id: 'fake-duplicate-id', identities: [] };
    expect(await signup({}, form())).toHaveProperty('message');
    expect(requests.filter(request => request.path === '/rest/v1/users')).toHaveLength(0);
  });
});
