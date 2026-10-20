import { BraveSearchClient } from '@darun/utils-llm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ProductResearchService } from '../ProductResearchService';

const nativeFetch = globalThis.fetch.bind(globalThis);

function sourceResult(title: string, url: string, description: string) {
  return { title, url, description };
}

describe('W10 lease abort fix: research caller-abort', () => {
  it('B-A4: 호출자 중단 검색은 실패 카운트·terminal 확정 없이 lease를 recovery에 맡긴다', async () => {
    const claimJob = vi.fn().mockResolvedValue({
      claimed: true,
      job: { id: 'job-w10-search', officialUrl: 'https://linear.app/' },
    });
    const failJob = vi.fn().mockResolvedValue(null);
    const completeJob = vi.fn().mockResolvedValue(null);
    const controller = new AbortController();
    controller.abort();
    // 호출자 abort 도중의 검색 실패는 terminal 확정 없이 lease를 recovery에 맡긴다.
    const search = vi.fn().mockResolvedValue({ ok: false, code: 'TIMEOUT', message: 'timed out by caller' });
    const service = new ProductResearchService();

    const attempted = await service.executeResearch(
      'job-w10-search',
      {
        jobRepository: { claimJob, completeJob, failJob },
        searchClient: { search },
        llm: { getModel: vi.fn().mockResolvedValue('fake-model'), complete: vi.fn() },
      } as never,
      '55555555-5555-4555-8555-555555555555',
      { signal: controller.signal, stageBudgetMs: 10_000 }
    );

    expect(search).not.toHaveBeenCalled();
    expect(failJob).not.toHaveBeenCalled();
    expect(completeJob).not.toHaveBeenCalled();
    expect(attempted).toEqual({ id: 'job-w10-search', officialUrl: 'https://linear.app/' });
  });

  it('B-A4: 일반 검색 실패는 기존처럼 실패 카운트로 흡수된다', async () => {
    const claimJob = vi.fn().mockResolvedValue({
      claimed: true,
      job: { id: 'job-w10-timeout', officialUrl: 'https://linear.app/' },
    });
    const failJob = vi.fn().mockResolvedValue(null);
    const search = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: 'TIMEOUT', message: 'timed out' })
      .mockResolvedValue({
        ok: true,
        results: [
          sourceResult('Linear 공식', 'https://linear.app/', 'Linear는 이슈 트래킹 도구입니다'),
          sourceResult('Linear 기능', 'https://linear.app/features', '빠르게 이슈를 관리합니다'),
          sourceResult('Linear 소개', 'https://linear.app/about', '협업 도구 Linear입니다'),
        ],
      });
    const complete = vi.fn().mockResolvedValue(null);
    const service = new ProductResearchService();

    await service.executeResearch(
      'job-w10-timeout',
      {
        jobRepository: { claimJob, completeJob: complete, failJob },
        searchClient: { search },
        llm: { getModel: vi.fn().mockResolvedValue('m'), complete: vi.fn().mockResolvedValue('{}') },
      } as never,
      '66666666-6666-4666-8666-666666666666',
      { stageBudgetMs: 10_000 }
    );

    // TIMEOUT 1회는 실패 카운트로 흡수되고 다음 쿼리를 계속 시도한다.
    expect(search.mock.calls.length).toBeGreaterThan(1);
    expect(failJob).not.toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'SEARCH_UNAVAILABLE' }));
  });

  it('B-A4: 검색 stage budget 만료는 단일 stall로 흡수되고 즉시 terminal 실패하지 않는다', async () => {
    const claimJob = vi.fn().mockResolvedValue({
      claimed: true,
      job: { id: 'job-w10-budget', officialUrl: 'https://linear.app/' },
    });
    const failJob = vi.fn().mockResolvedValue(null);
    const complete = vi.fn().mockResolvedValue(null);
    // 첫 쿼리의 stage budget 만료를 재현: budget 타이머가 이 promise를 중단시킨다.
    const search = vi
      .fn()
      .mockImplementationOnce(
        (_query: string, _count: number, signal?: AbortSignal) =>
          new Promise(resolve => {
            const timer = setTimeout(() => resolve({ ok: false, code: 'TIMEOUT', message: 'late' }), 500);
            signal?.addEventListener('abort', () => {
              clearTimeout(timer);
              resolve({ ok: false, code: 'TIMEOUT', message: 'aborted by budget' });
            });
          })
      )
      .mockResolvedValue({
        ok: true,
        results: [
          sourceResult('Linear 공식', 'https://linear.app/', 'Linear는 이슈 트래킹 도구입니다'),
          sourceResult('Linear 기능', 'https://linear.app/features', '빠르게 이슈를 관리합니다'),
          sourceResult('Linear 소개', 'https://linear.app/about', '협업 도구 Linear입니다'),
        ],
      });
    const service = new ProductResearchService();

    await service.executeResearch(
      'job-w10-budget',
      {
        jobRepository: { claimJob, completeJob: complete, failJob },
        searchClient: { search },
        llm: { getModel: vi.fn().mockResolvedValue('m'), complete: vi.fn().mockResolvedValue('{}') },
      } as never,
      '77777777-7777-4777-8777-777777777777',
      { stageBudgetMs: 60_000 }
    );

    // budget 만료는 1회 실패로 흡수되고 다음 쿼리를 계속 시도하므로 RETRY_EXHAUSTED가 아니다.
    expect(search.mock.calls.length).toBeGreaterThan(1);
    expect(failJob).not.toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'RETRY_EXHAUSTED' }));
  });
});

type Arrivals = {
  arrived: () => void;
  wait: (at: number) => Promise<void>;
};

type BodyServer = {
  origin: string;
  queries: string[];
  closes: Array<'finished' | 'aborted'>;
  maxConcurrent: number;
  arrivals: Arrivals;
  drained: () => Promise<void>;
  close: () => Promise<void>;
};

function trackArrivals(): Arrivals {
  let arrived = 0;
  const waiters: Array<{ at: number; resolve: () => void }> = [];
  return {
    arrived: () => {
      arrived += 1;
      for (const waiter of [...waiters]) {
        if (arrived < waiter.at) continue;
        waiters.splice(waiters.indexOf(waiter), 1);
        waiter.resolve();
      }
    },
    wait: (at: number) => {
      if (arrived >= at) return Promise.resolve();
      return new Promise<void>(resolve => {
        waiters.push({ at, resolve });
      });
    },
  };
}

/** 실제 fetch/Response body는 유지하고 목적지만 로컬 서버로 격리한다. */
function redirectingFetch(origin: string, onHeaders: () => void) {
  return async (input: URL | string, init?: RequestInit): Promise<Response> => {
    const target = new URL(String(input));
    const response = await nativeFetch(new URL(`${target.pathname}${target.search}`, origin), init);
    onHeaders();
    return response;
  };
}

async function startBodyServer(stalledRequests: number, body: unknown): Promise<BodyServer> {
  const queries: string[] = [];
  const closes: Array<'finished' | 'aborted'> = [];
  const arrivals = trackArrivals();
  const drainWaiters: Array<() => void> = [];
  let active = 0;
  let maxConcurrent = 0;
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    queries.push(new URL(req.url ?? '/', 'http://local').searchParams.get('q') ?? '');
    active += 1;
    maxConcurrent = Math.max(maxConcurrent, active);
    res.on('close', () => {
      active -= 1;
      closes.push(res.writableFinished ? 'finished' : 'aborted');
      if (active === 0) for (const drain of drainWaiters.splice(0)) drain();
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (queries.length <= stalledRequests) {
      res.write('{"web":{"results":[{"title"');
      return;
    }
    res.end(JSON.stringify(body));
  });
  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    queries,
    closes,
    get maxConcurrent() {
      return maxConcurrent;
    },
    arrivals,
    drained: () => {
      if (active === 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        drainWaiters.push(resolve);
      });
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close(error => (error ? reject(error) : resolve()));
      }),
  };
}

describe('W10 body abort fix: 실제 BraveSearchClient와 로컬 전송', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stalled body의 요청 budget 만료는 기존 다음 질의로 흡수되고 이후 정상 응답이 조사를 완료한다', async () => {
    const server = await startBodyServer(1, {
      web: {
        results: [
          sourceResult('Linear 공식', 'https://linear.app/', 'Linear는 이슈 트래킹 도구입니다'),
          sourceResult('외부 리뷰 A', 'https://a.example/review', 'Linear는 이슈 트래킹 도구입니다'),
          sourceResult('외부 리뷰 B', 'https://b.example/review', '빠르게 이슈를 관리합니다'),
        ],
      },
    });
    vi.stubGlobal('fetch', redirectingFetch(server.origin, server.arrivals.arrived));
    const completeJob = vi.fn().mockResolvedValue(null);
    const failJob = vi.fn().mockResolvedValue(null);
    const retryJobLease = vi.fn().mockResolvedValue(null);
    const service = new ProductResearchService();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const running = service.executeResearch(
      'job-body-next-query',
      {
        jobRepository: {
          claimJob: vi.fn().mockResolvedValue({
            claimed: true,
            job: { id: 'job-body-next-query', officialUrl: 'https://linear.app/' },
          }),
          completeJob,
          failJob,
          retryJobLease,
        },
        categoryRepository: { findAll: vi.fn().mockResolvedValue([]) },
        searchClient: new BraveSearchClient(() => 'synthetic-key'),
        llm: {
          getModel: vi.fn().mockResolvedValue('test-model'),
          complete: vi.fn().mockResolvedValue(
            JSON.stringify({
              name: 'Linear',
              nameAnchors: [{ sourceId: 's1', excerpt: 'Linear는 이슈' }],
              summary: '이슈 트래킹 도구',
              summaryAnchors: [{ sourceId: 's1', excerpt: '이슈 트래킹 도구입니다' }],
              categoryCandidates: [],
              features: [
                {
                  name: '이슈 관리',
                  summary: '이슈를 빠르게 관리',
                  emoji: '✨',
                  anchors: [{ sourceId: 's3', excerpt: '빠르게 이슈를 관리합니다' }],
                },
              ],
              tags: ['협업'],
              companyCandidate: null,
              alternativeCandidates: [],
              suggestedSlug: 'linear',
              warnings: [],
            })
          ),
        },
      } as never,
      '22222222-2222-4222-8222-222222222222'
    );
    await server.arrivals.wait(1);
    // 헤더만 도착한 첫 본문은 요청 budget으로 끊기고 그 TIMEOUT은 기존 실패 카운트로 흡수된다.
    vi.advanceTimersByTime(10_000);
    await running;
    await server.drained();
    expect(completeJob).toHaveBeenCalledTimes(1);
    expect(failJob).not.toHaveBeenCalled();
    expect(retryJobLease).not.toHaveBeenCalled();
    expect(server.queries).toHaveLength(5);
    expect(server.closes.filter(kind => kind === 'aborted')).toHaveLength(1);
    expect(server.closes.filter(kind => kind === 'finished')).toHaveLength(4);
    expect(server.maxConcurrent).toBe(1);
    await server.close();
  });

  it('연속된 stalled body 두 번은 기존 SEARCH_UNAVAILABLE 재시도로 남고 terminal 확정하지 않는다', async () => {
    const server = await startBodyServer(2, {
      web: { results: [sourceResult('Linear 공식', 'https://linear.app/', 'Linear는 이슈 트래킹 도구입니다')] },
    });
    vi.stubGlobal('fetch', redirectingFetch(server.origin, server.arrivals.arrived));
    const completeJob = vi.fn().mockResolvedValue(null);
    const failJob = vi.fn().mockResolvedValue(null);
    const retryJobLease = vi.fn().mockResolvedValue(null);
    const service = new ProductResearchService();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const running = service.executeResearch(
      'job-body-retry',
      {
        jobRepository: {
          claimJob: vi.fn().mockResolvedValue({
            claimed: true,
            job: { id: 'job-body-retry', officialUrl: 'https://linear.app/' },
          }),
          completeJob,
          failJob,
          retryJobLease,
        },
        categoryRepository: { findAll: vi.fn().mockResolvedValue([]) },
        searchClient: new BraveSearchClient(() => 'synthetic-key'),
        llm: { getModel: vi.fn(), complete: vi.fn() },
      } as never,
      '33333333-3333-4333-8333-333333333333'
    );
    await server.arrivals.wait(1);
    vi.advanceTimersByTime(10_000);
    await server.arrivals.wait(2);
    vi.advanceTimersByTime(10_000);
    await running;
    await server.drained();
    // stalled body의 TIMEOUT은 기존 실패 카운트로 흡수되고 두 번째 실패가 SEARCH_UNAVAILABLE 재시도를 만든다.
    expect(retryJobLease).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-body-retry', errorCode: 'SEARCH_UNAVAILABLE' })
    );
    expect(failJob).not.toHaveBeenCalled();
    expect(completeJob).not.toHaveBeenCalled();
    expect(server.queries).toHaveLength(2);
    expect(server.closes.filter(kind => kind === 'aborted')).toHaveLength(2);
    expect(server.maxConcurrent).toBe(1);
    await server.close();
  });
});
