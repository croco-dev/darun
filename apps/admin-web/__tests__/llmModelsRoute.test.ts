import { authChecker } from '@darun/provider-auth/server';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../app/api/llm/models/route';

vi.mock('@darun/provider-auth/server', () => ({
  authChecker: {
    getIsAdmin: vi.fn(),
    init: vi.fn(),
  },
  initAuthProvider: vi.fn(),
}));

vi.mock('../../app/container', () => ({
  container: { createAuthService: vi.fn() },
}));

function okModels(payload: unknown = { data: [{ id: 'google/gemini-2.5-flash' }] }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => payload,
    headers: new Headers(),
  });
}

function unauthenticated() {
  vi.mocked(authChecker.getIsAdmin).mockResolvedValue(false);
}

function authenticated() {
  vi.mocked(authChecker.getIsAdmin).mockResolvedValue(true);
}

describe('app/api/llm/models/route', () => {
  const originalFetch = global.fetch;
  const originalEndpoint = process.env['OPEN_ROUTER_ENDPOINT'];
  const originalKey = process.env['OPEN_ROUTER_API_KEY'];

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env['OPEN_ROUTER_ENDPOINT'];
    delete process.env['OPEN_ROUTER_API_KEY'];
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEndpoint === undefined) delete process.env['OPEN_ROUTER_ENDPOINT'];
    else process.env['OPEN_ROUTER_ENDPOINT'] = originalEndpoint;
    if (originalKey === undefined) delete process.env['OPEN_ROUTER_API_KEY'];
    else process.env['OPEN_ROUTER_API_KEY'] = originalKey;
  });

  it('GET: unauthenticated requests end 401 with zero upstream fetches', async () => {
    unauthenticated();
    const upstream = vi.fn();
    global.fetch = upstream;

    const req = new NextRequest('http://localhost:3001/api/llm/models?endpoint=https://openrouter.ai/api/v1');
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('POST: unauthenticated requests end 401 with zero upstream fetches', async () => {
    unauthenticated();
    const upstream = vi.fn();
    global.fetch = upstream;

    const req = new NextRequest('http://localhost:3001/api/llm/models', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://openrouter.ai/api/v1' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('GET: fetches allowlisted provider models without a caller key using the server key', async () => {
    authenticated();
    process.env['OPEN_ROUTER_API_KEY'] = 'server-default-key';
    okModels();

    const req = new NextRequest('http://localhost:3001/api/llm/models?endpoint=https://openrouter.ai/api/v1');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer server-default-key',
        }),
      })
    );
  });

  it('POST: non-allowlisted endpoint is fetched without the server key', async () => {
    authenticated();
    process.env['OPEN_ROUTER_API_KEY'] = 'server-default-key';
    okModels();

    const req = new NextRequest('http://localhost:3001/api/llm/models', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://custom-llm.example.org/v1' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(init.headers['Authorization']).toBeUndefined();
  });

  it('POST: caller key to a non-allowlisted endpoint is forwarded but the server key is not', async () => {
    authenticated();
    process.env['OPEN_ROUTER_API_KEY'] = 'server-default-key';
    okModels();

    const req = new NextRequest('http://localhost:3001/api/llm/models', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://custom-llm.example.org/v1', apiKey: 'caller-key' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(init.headers['Authorization']).toBe('Bearer caller-key');
  });

  it('GET: rejects apiKey via query before any upstream fetch', async () => {
    authenticated();
    const upstream = vi.fn();
    global.fetch = upstream;

    const req = new NextRequest(
      'http://localhost:3001/api/llm/models?endpoint=https://openrouter.ai/api/v1&apiKey=secret'
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([
    ['loopback', 'https://openrouter.ai@127.0.0.1/v1'],
    ['rfc1918', 'https://10.0.0.5/v1'],
    ['decimal-ip', 'http://2130706433/v1'],
    ['hex-ip', 'http://0x7f.0.0.1/v1'],
    ['metadata', 'https://169.254.169.254/latest'],
    ['url-credentials', 'https://user:pass@openrouter.ai/api/v1'],
    ['plain-http', 'http://openrouter.ai/api/v1'],
    ['redirect-to-internal', 'https://custom-llm.example.org/v1'],
  ])('POST: rejects %s targets pre-fetch', async (_label, endpoint) => {
    authenticated();
    if (_label === 'redirect-to-internal') {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 302,
        headers: new Headers({ location: 'http://127.0.0.1/secret' }),
        arrayBuffer: async () => new ArrayBuffer(0),
      });
    } else {
      global.fetch = vi.fn();
    }

    const req = new NextRequest('http://localhost:3001/api/llm/models', {
      method: 'POST',
      body: JSON.stringify({ endpoint, apiKey: 'caller-key' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect([400, 500]).toContain(res.status);
    if (_label === 'redirect-to-internal') {
      expect(res.status).toBe(500);
    } else {
      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    }
    expect(JSON.stringify(body)).not.toContain('caller-key');
    expect(JSON.stringify(body)).not.toContain('server-default-key');
  });

  it('POST: upstream failure body carries no key material', async () => {
    authenticated();
    process.env['OPEN_ROUTER_API_KEY'] = 'server-default-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      arrayBuffer: async () => new ArrayBuffer(0),
    });

    const req = new NextRequest('http://localhost:3001/api/llm/models', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://openrouter.ai/api/v1', apiKey: 'caller-key' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain('모델 목록 조회에 실패했습니다');
    expect(JSON.stringify(body)).not.toContain('caller-key');
    expect(JSON.stringify(body)).not.toContain('server-default-key');
  });

  it('POST: same-host redirect keeps caller key and never attaches the server key', async () => {
    authenticated();
    process.env['OPEN_ROUTER_API_KEY'] = 'server-default-key';
    const seen: Array<{ url: string; authorization?: string }> = [];
    global.fetch = vi.fn().mockImplementation(async (url: string, init: { headers: Record<string, string> }) => {
      seen.push({ url, authorization: init.headers['Authorization'] });
      if (seen.length === 1) {
        return {
          ok: false,
          status: 302,
          // 동일 호스트 경로 변경: 호출자 키 스코프 안, 서버 키 첨부 없음.
          headers: new Headers({ location: 'https://custom-llm.example.org/v2/models' }),
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
        headers: new Headers(),
      };
    });

    const req = new NextRequest('http://localhost:3001/api/llm/models', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://custom-llm.example.org/v1', apiKey: 'caller-key' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(seen).toHaveLength(2);
    // 초기 동일 호스트에서는 호출자 키가 전달된다.
    expect(seen[0]?.authorization).toBe('Bearer caller-key');
    // 동일 호스트 리다이렉트에서도 호출자 키만 유지되고 서버 키는 첨부되지 않는다.
    expect(seen[1]?.authorization).toBe('Bearer caller-key');
    expect(JSON.stringify(seen)).not.toContain('server-default-key');
  });

  it('POST: cross-host allowlisted redirect drops the caller key and uses only the server key', async () => {
    authenticated();
    process.env['OPEN_ROUTER_API_KEY'] = 'server-default-key';
    const seen: Array<{ url: string; authorization?: string }> = [];
    global.fetch = vi.fn().mockImplementation(async (url: string, init: { headers: Record<string, string> }) => {
      seen.push({ url, authorization: init.headers['Authorization'] });
      if (seen.length === 1) {
        return {
          ok: false,
          status: 302,
          headers: new Headers({ location: 'https://openrouter.ai/api/v1/models' }),
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
        headers: new Headers(),
      };
    });

    const req = new NextRequest('http://localhost:3001/api/llm/models', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://custom-llm.example.org/v1', apiKey: 'caller-key' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(seen).toHaveLength(2);
    expect(seen[0]?.authorization).toBe('Bearer caller-key');
    // allowlisted 크로스 호스트 홉에서는 호출자 키를 전달하지 않고 서버 키만 쓴다.
    expect(seen[1]?.authorization).toBe('Bearer server-default-key');
  });

  it('POST: same-host non-allowlisted redirect keeps caller key but cross-host drops it', async () => {
    authenticated();
    process.env['OPEN_ROUTER_API_KEY'] = 'server-default-key';
    const seen: Array<{ url: string; authorization?: string }> = [];
    global.fetch = vi.fn().mockImplementation(async (url: string, init: { headers: Record<string, string> }) => {
      seen.push({ url, authorization: init.headers['Authorization'] });
      if (seen.length === 1) {
        return {
          ok: false,
          status: 302,
          headers: new Headers({ location: 'https://openrouter.ai/api/v2/models' }),
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }
      if (seen.length === 2) {
        return {
          ok: false,
          status: 302,
          headers: new Headers({ location: 'https://custom-llm.example.org/v1/models' }),
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
        headers: new Headers(),
      };
    });

    const req = new NextRequest('http://localhost:3001/api/llm/models', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://openrouter.ai/api/v1', apiKey: 'caller-key' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(seen).toHaveLength(3);
    // 동일 allowlisted 호스트 리다이렉트는 호출자 키를 유지한다.
    expect(seen[1]?.authorization).toBe('Bearer caller-key');
    // 크로스 호스트(non-allowlisted) 홉에서는 호출자 키를 전달하지 않는다.
    expect(seen[2]?.authorization).toBeUndefined();
  });
});
