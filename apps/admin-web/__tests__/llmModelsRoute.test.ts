import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { RequestOptions } from 'node:https';
import { PassThrough } from 'node:stream';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), dns: vi.fn(), https: vi.fn() }));
vi.mock('../app/container', () => ({ container: { createAuthService: mocks.auth } }));
vi.mock('node:dns', () => ({ lookup: mocks.dns }));
vi.mock('node:https', () => ({ request: mocks.https }));
import { GET, POST } from '../app/api/llm/models/route';

const admin = { id: 'admin-1', email: 'admin@example.com', isAdmin: true };
const endpoint = 'https://provider.example.com/v1';
let user: typeof admin | null;
let status: number;
let encoding: string | undefined;
let chunks: Buffer[];
let options: RequestOptions;
let destroy: ReturnType<typeof vi.fn>;
let response: PassThrough;

function request(body: unknown = { endpoint, apiKey: 'provider-only-key' }) {
  return new NextRequest('http://localhost:3001/api/llm/models', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('OPEN_ROUTER_API_KEY', 'environment-only-key');
  vi.stubEnv('OPEN_ROUTER_ENDPOINT', 'https://openrouter.ai/api/v1');
  user = admin;
  status = 200;
  encoding = undefined;
  chunks = [Buffer.from('{"data":[{"id":"provider/model-one"}]}')];
  mocks.auth.mockImplementation(() => ({ setAuthStorage: vi.fn(), getUser: vi.fn(async () => user) }));
  mocks.dns.mockImplementation((_host, _options, callback) => callback(null, [{ address: '8.8.4.4', family: 4 }]));
  mocks.https.mockImplementation((_url, suppliedOptions, callback) => {
    options = suppliedOptions;
    const req = new EventEmitter();
    destroy = vi.fn();
    Object.assign(req, {
      destroy,
      end: () =>
        queueMicrotask(() => {
          response = new PassThrough();
          Object.assign(response, { statusCode: status, headers: { 'content-encoding': encoding } });
          callback(response);
          for (const chunk of chunks) response.write(chunk);
          response.end();
        }),
    });
    return req;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('request-local authorization', () => {
  it.each([
    ['anonymous', null, 401],
    ['ordinary user', { ...admin, isAdmin: false }, 403],
  ] as const)('denies %s before provider DNS or HTTPS on both methods', async (_role, suppliedUser, expected) => {
    user = suppliedUser;
    for (const method of [GET, POST]) {
      const res = await method(request());
      expect(res.status).toBe(expected);
    }
    expect(mocks.dns).not.toHaveBeenCalled();
    expect(mocks.https).not.toHaveBeenCalled();
    expect(mocks.auth).toHaveBeenCalledTimes(2);
  });

  it.each(['construction', 'verification'])('fails closed on auth %s errors without exposing details', async stage => {
    if (stage === 'construction')
      mocks.auth.mockImplementation(() => {
        throw new Error('private-auth-key');
      });
    else
      mocks.auth.mockReturnValue({
        setAuthStorage: vi.fn(),
        getUser: vi.fn().mockRejectedValue(new Error('private-auth-key')),
      });
    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(await res.text()).not.toContain('private-auth-key');
    expect(mocks.dns).not.toHaveBeenCalled();
    expect(mocks.https).not.toHaveBeenCalled();
  });

  it('authenticates actual GET cookies, returns 405 and retains refreshed cookies without interpreting query keys', async () => {
    let storage: { get: (name: string) => string | null; set: (values: { idToken: string }) => void };
    mocks.auth.mockReturnValue({
      setAuthStorage: vi.fn(value => {
        storage = value;
      }),
      getUser: vi.fn(async () => {
        expect(storage.get('idToken')).toBe('old-token');
        storage.set({ idToken: 'refreshed-token' });
        return admin;
      }),
    });
    const res = await GET(
      new NextRequest('http://localhost:3001/api/llm/models?endpoint=https://internal.local&apiKey=query-key', {
        headers: { Cookie: 'idToken=old-token' },
      })
    );
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect(res.cookies.get('idToken')?.value).toBe('refreshed-token');
    expect(mocks.dns).not.toHaveBeenCalled();
    expect(mocks.https).not.toHaveBeenCalled();
  });
});

describe('endpoint and key policy', () => {
  it.each([
    'http://provider.example.com/v1',
    'https://provider.example.com:8443/v1',
    'https://user:pass@provider.example.com/v1',
    'https://provider.example.com/v1?secret=x',
    'https://provider.example.com/v1#x',
    'https://provider.example.com/v1?',
    'https://8.8.8.8/v1',
    'https://127.0.0.1/v1',
    'https://[::1]/v1',
    'https://[::ffff:127.0.0.1]/v1',
    'https://localhost/v1',
    'https://metadata.google.internal/v1',
    'https://intranet/v1',
    'https://provider.local/v1',
    'https://provider.lan/v1',
  ])('rejects prohibited endpoint %s before DNS', async prohibited => {
    expect((await POST(request({ endpoint: prohibited }))).status).toBe(400);
    expect(mocks.dns).not.toHaveBeenCalled();
    expect(mocks.https).not.toHaveBeenCalled();
  });

  it.each(['10.0.0.1', '127.0.0.1', '169.254.169.254', '224.0.0.1', '198.18.0.1', 'fd00::1', '::ffff:127.0.0.1'])(
    'rejects public A plus prohibited address %s without sending credentials',
    async privateAddress => {
      mocks.dns.mockImplementation((_host, _options, callback) =>
        callback(null, [
          { address: '8.8.8.8', family: 4 },
          { address: privateAddress, family: privateAddress.includes(':') ? 6 : 4 },
        ])
      );
      expect((await POST(request())).status).toBe(400);
      expect(mocks.https).not.toHaveBeenCalled();
    }
  );

  it('pins the validated public IP while retaining original hostname TLS identity and no pooled agent', async () => {
    const res = await POST(request({ endpoint: `${endpoint}/models/`, apiKey: 'provider-only-key' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [{ id: 'provider/model-one' }] });
    expect(mocks.https.mock.calls[0][0]).toBe(`${endpoint}/models`);
    expect(options).toMatchObject({
      agent: false,
      autoSelectFamily: false,
      servername: 'provider.example.com',
      rejectUnauthorized: true,
      headers: { Authorization: 'Bearer provider-only-key' },
    });
    const callback = vi.fn();
    // Even if DNS changes after validation, the socket lookup returns only the validated address.
    mocks.dns.mockImplementation(() => {
      throw new Error('must not re-resolve');
    });
    options.lookup?.('provider.example.com', { all: false }, callback);
    expect(callback).toHaveBeenCalledWith(null, '8.8.4.4', 4);
    options.lookup?.('provider.example.com', { all: true }, callback);
    expect(callback).toHaveBeenLastCalledWith(null, [{ address: '8.8.4.4', family: 4 }]);
    expect(mocks.dns).toHaveBeenCalledTimes(1);
  });

  it.each([
    [endpoint, undefined],
    ['https://openrouter.ai/api/v1/models/', 'Bearer environment-only-key'],
  ])('selects credentials only for the exact default base: %s', async (url, expectedAuth) => {
    expect((await POST(request({ endpoint: url }))).status).toBe(200);
    const headers = options.headers;
    expect(headers).toEqual(
      expectedAuth ? { Accept: 'application/json', Authorization: expectedAuth } : { Accept: 'application/json' }
    );
  });

  it('rejects an explicitly copied environment key on a custom base', async () => {
    const res = await POST(request({ endpoint, apiKey: 'environment-only-key' }));
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain('environment-only-key');
    expect(mocks.dns).not.toHaveBeenCalled();
  });
});

describe('bounded and sanitized failures', () => {
  it.each([null, [], { endpoint: 123 }, { apiKey: false }])('rejects malformed body %j', async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.dns).not.toHaveBeenCalled();
  });
  it('enforces UTF-8 bytes, not characters, at the 16KiB request boundary', async () => {
    const small = JSON.stringify({ apiKey: '' });
    const exact = small.replace('""', `"${'x'.repeat(16384 - Buffer.byteLength(small))}"`);
    const accepted = await POST(new NextRequest('http://localhost/api/llm/models', { method: 'POST', body: exact }));
    expect(accepted.status).toBe(200);
    const oversized = await POST(request({ apiKey: '가'.repeat(6000) }));
    expect(oversized.status).toBe(400);
  });
  it.each([302, 401, 500])(
    'maps upstream HTTP %s to sanitized 502 without reflecting body or keys',
    async suppliedStatus => {
      status = suppliedStatus;
      chunks = [Buffer.from('private-upstream-payload provider-only-key')];
      const res = await POST(request());
      expect(res.status).toBe(502);
      const text = await res.text();
      expect(text).not.toContain('private-upstream-payload');
      expect(text).not.toContain('provider-only-key');
      expect(destroy).toHaveBeenCalled();
    }
  );
  it('rejects unexpected compression and closes the response', async () => {
    encoding = 'gzip';
    expect((await POST(request())).status).toBe(502);
    expect(response.destroyed).toBe(true);
  });
  it('accepts exactly 2MiB JSON and closes the stream at one byte above the boundary', async () => {
    const json = '{"data":[],"padding":""}';
    const exact = json.replace('""', `"${'x'.repeat(2 * 1024 * 1024 - Buffer.byteLength(json))}"`);
    chunks = [Buffer.from(exact)];
    expect((await POST(request())).status).toBe(200);
    chunks = [Buffer.from(exact), Buffer.from(' ')];
    expect((await POST(request())).status).toBe(502);
    expect(response.destroyed).toBe(true);
  });
  it.each(['not-json-secret', '{"not_models":true}', 'null'])(
    'rejects invalid model JSON %s without echoing it',
    async invalid => {
      chunks = [Buffer.from(invalid)];
      const res = await POST(request());
      expect(res.status).toBe(502);
      expect(await res.text()).not.toContain(invalid);
    }
  );
  it.each(['dns', 'http'])('enforces the total 10s deadline during %s', async stage => {
    vi.useFakeTimers();
    if (stage === 'dns') mocks.dns.mockImplementation(() => {});
    else
      mocks.https.mockImplementation((_url, suppliedOptions) => {
        options = suppliedOptions;
        destroy = vi.fn();
        return Object.assign(new EventEmitter(), { destroy, end: vi.fn() });
      });
    const pending = POST(request());
    await vi.advanceTimersByTimeAsync(9999);
    expect(mocks.dns).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).status).toBe(504);
    if (stage === 'http') {
      expect(options.signal?.aborted).toBe(true);
      expect(destroy).toHaveBeenCalled();
    }
    expect(vi.getTimerCount()).toBe(0);
  });
});
