import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { BraveSearchClient } from '../search/BraveSearchClient';

const nativeFetch = globalThis.fetch.bind(globalThis);

type RequestLog = { id: number; query: string; closed: 'finished' | 'aborted' | null };

type SearchServer = {
  origin: string;
  requests: RequestLog[];
  events: string[];
  maxConcurrent: number;
  respond: (res: ServerResponse, request: RequestLog) => void;
  drained: () => Promise<void>;
  close: () => Promise<void>;
};

async function startSearchServer(respond: SearchServer['respond']): Promise<SearchServer> {
  const requests: RequestLog[] = [];
  const events: string[] = [];
  const drainWaiters: Array<() => void> = [];
  let active = 0;
  let maxConcurrent = 0;
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const request: RequestLog = {
      id: requests.length + 1,
      query: new URL(req.url ?? '/', 'http://local').searchParams.get('q') ?? '',
      closed: null,
    };
    requests.push(request);
    events.push(`request:${request.id}`);
    active += 1;
    maxConcurrent = Math.max(maxConcurrent, active);
    res.on('close', () => {
      active -= 1;
      request.closed = res.writableFinished ? 'finished' : 'aborted';
      events.push(`close:${request.id}:${request.closed}`);
      if (active === 0) for (const drain of drainWaiters.splice(0)) drain();
    });
    respond(res, request);
  });
  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    events,
    get maxConcurrent() {
      return maxConcurrent;
    },
    respond,
    drained: () =>
      active === 0
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            drainWaiters.push(resolve);
          }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close(error => (error ? reject(error) : resolve()));
      }),
  };
}

/** 실제 fetch/Response body는 유지하고 목적지만 로컬 서버로 격리한다. */
function isolateFetchDestination(origin: string, onHeaders: () => void): void {
  vi.stubGlobal('fetch', async (input: URL | string, init?: RequestInit) => {
    const target = new URL(String(input));
    const response = await nativeFetch(new URL(`${target.pathname}${target.search}`, origin), init);
    onHeaders();
    return response;
  });
}

function stalledBodyResponse(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write('{"web":{"results":[{"title"');
}

function jsonResponse(res: ServerResponse, body: unknown): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

describe('W10 lease abort fix: BraveSearchClient caller abort', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('B-A4: 호출자 abort는 TIMEOUT 계약으로 신호하고 lease를 recovery에 맡긴다', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: unknown, init?: { signal?: AbortSignal }) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const aborted = new Error('This operation was aborted');
      aborted.name = 'AbortError';
      return Promise.reject(aborted);
    });
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    controller.abort();
    const client = new BraveSearchClient(() => 'key');
    const outcome = await client.search('linear', 5, controller.signal);
    expect(outcome).toEqual({ ok: false, code: 'TIMEOUT', message: 'Brave search was aborted' });
    // 이미 중단된 신호는 fetch까지 가지 않고 즉시 반환된다.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('요청 budget은 성공 헤더 뒤 멈춘 본문을 끊고, 실제 요청이 끝난 뒤에만 다음 질의를 시작한다', async () => {
    const server = await startSearchServer((res, request) => {
      if (request.id === 1) {
        stalledBodyResponse(res);
        return;
      }
      jsonResponse(res, {
        web: { results: [{ title: 'Linear', url: 'https://linear.app', description: 'Plan work' }] },
      });
    });
    let notifyHeaders = () => {};
    const headersArrived = new Promise<void>(resolve => {
      notifyHeaders = resolve;
    });
    isolateFetchDestination(server.origin, notifyHeaders);
    const client = new BraveSearchClient(() => 'synthetic-key');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const stalled = client.search('stalled query');
    await headersArrived;
    // 헤더 이후 본문 소비가 실제로 시작된 뒤에 요청 budget을 만료시킨다.
    await new Promise<void>(resolve => {
      setImmediate(resolve);
    });
    vi.advanceTimersByTime(10_000);
    expect(await stalled).toEqual({ ok: false, code: 'TIMEOUT', message: 'Brave search request timed out' });
    const recovered = await client.search('next query');
    expect(recovered).toEqual({
      ok: true,
      results: [{ title: 'Linear', url: 'https://linear.app', description: 'Plan work', extraSnippets: [] }],
    });
    await server.drained();
    expect(server.requests.map(request => request.query)).toEqual(['stalled query', 'next query']);
    expect(server.requests[0]!.closed).toBe('aborted');
    expect(server.requests[1]!.closed).toBe('finished');
    // 이전 요청의 연결 종료 전에 다음 요청이 시작되지 않는다.
    expect(server.events).toEqual(['request:1', 'close:1:aborted', 'request:2', 'close:2:finished']);
    expect(server.maxConcurrent).toBe(1);
    await server.close();
  });

  it('헤더 도착 후 부모 abort는 본문 소비와 실제 연결을 종료한다', async () => {
    const server = await startSearchServer((res, request) => {
      expect(request.query).toBe('linear');
      stalledBodyResponse(res);
    });
    let notifyHeaders = () => {};
    const headersArrived = new Promise<void>(resolve => {
      notifyHeaders = resolve;
    });
    isolateFetchDestination(server.origin, notifyHeaders);
    const client = new BraveSearchClient(() => 'synthetic-key');
    const controller = new AbortController();
    const searching = client.search('linear', 5, controller.signal);
    await headersArrived;
    // 헤더 이후 본문 소비가 실제로 시작된 뒤에 부모 신호를 중단시킨다.
    await new Promise<void>(resolve => {
      setImmediate(resolve);
    });
    controller.abort();
    expect(await searching).toEqual({ ok: false, code: 'TIMEOUT', message: 'Brave search was aborted' });
    await server.drained();
    expect(server.requests).toHaveLength(1);
    expect(server.requests[0]!.closed).toBe('aborted');
    expect(server.events).toEqual(['request:1', 'close:1:aborted']);
    expect(server.maxConcurrent).toBe(1);
    await server.close();
  });

  it('본문 전체를 받은 malformed JSON은 기존 invalid-JSON 분류를 유지한다', async () => {
    const server = await startSearchServer((res, request) => {
      expect(request.query).toBe('linear');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"web":{"results":');
    });
    isolateFetchDestination(server.origin, () => {});
    const client = new BraveSearchClient(() => 'synthetic-key');
    const outcome = await client.search('linear');
    expect(outcome).toEqual({
      ok: false,
      code: 'UPSTREAM_ERROR',
      message: 'Brave search returned invalid JSON',
    });
    await server.drained();
    expect(server.requests[0]!.closed).toBe('finished');
    expect(server.maxConcurrent).toBe(1);
    await server.close();
  });
});
