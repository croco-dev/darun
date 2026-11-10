import { revalidatePath } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logout } from './actions';

const fixture = vi.hoisted(() => ({ cookies: new Map<string, string>() }));
vi.mock('next/headers', () => ({
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

const cookieName = 'sb-127-auth-token';
const user = {
  id: '76e399d5-6fa5-4d75-843b-e43aeb956497',
  email: 'logout@example.invalid',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-11-10T00:00:00Z',
};
const jwt = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4_000_000_000 })).toString('base64url')}.fixture`;
const session = {
  access_token: jwt,
  refresh_token: 'fixture-refresh',
  expires_at: 4_000_000_000,
  token_type: 'bearer',
  user,
};
let status: number;
let networkFails: boolean;
let requests: URL[];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:4475');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'fixture-public-key');
  fixture.cookies.clear();
  fixture.cookies.set(cookieName, `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`);
  status = 204;
  networkFails = false;
  requests = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.origin !== 'http://127.0.0.1:4475' || url.pathname !== '/auth/v1/logout') {
      throw new Error(`Unexpected request: ${url.origin}${url.pathname}`);
    }
    requests.push(url);
    if (networkFails) throw new TypeError('fixture private network detail');
    return status === 204
      ? new Response(null, { status })
      : Response.json({ msg: 'fixture private provider detail' }, { status });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('logout through the real Supabase server client', () => {
  it.each(['provider', 'network'])(
    'keeps the session and page after a %s failure, then retries successfully',
    async kind => {
      status = 500;
      networkFails = kind === 'network';
      const before = fixture.cookies.get(cookieName);
      const result = await logout();
      expect(result.error).toBeTruthy();
      expect(JSON.stringify(result)).not.toMatch(/fixture|private/);
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(fixture.cookies.get(cookieName)).toBe(before);
      expect(requests).toHaveLength(1);
      expect(requests[0].searchParams.get('scope')).toBe('global');

      status = 204;
      networkFails = false;
      await expect(logout()).rejects.toThrow('redirect:/auth/signin');
      expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/', 'layout');
      expect(fixture.cookies.get(cookieName)).toBe('');
      expect(requests).toHaveLength(2);
    }
  );

  it.each([204, 401, 403, 404])('keeps provider success semantics for HTTP %s', async responseStatus => {
    status = responseStatus;
    await expect(logout()).rejects.toThrow('redirect:/auth/signin');
    expect(fixture.cookies.get(cookieName)).toBe('');
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/', 'layout');
  });

  it('allows an already absent session without a provider request', async () => {
    fixture.cookies.clear();
    await expect(logout()).rejects.toThrow('redirect:/auth/signin');
    expect(requests).toHaveLength(0);
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/', 'layout');
  });
});
