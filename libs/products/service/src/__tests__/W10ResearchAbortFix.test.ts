import { describe, expect, it, vi } from 'vitest';
import { ProductResearchService } from '../ProductResearchService';

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
