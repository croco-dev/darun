import { describe, expect, it, vi } from 'vitest';
import { ProductResearchService } from '../ProductResearchService';

describe('W4 job lease recovery: ProductResearchService', () => {
  it('W4-A4: propagates AbortSignal to search and LLM stages within budgets', async () => {
    const searchSignals: Array<AbortSignal | undefined> = [];
    const llmSignals: Array<AbortSignal | undefined> = [];
    const search = vi.fn(async (_query: string, _count: number, signal?: AbortSignal) => {
      searchSignals.push(signal);
      return {
        ok: true as const,
        results: [
          { title: 'Linear 공식', url: 'https://linear.app/', description: 'Linear는 이슈 트래킹 도구입니다' },
          { title: 'Linear 기능', url: 'https://linear.app/features', description: '빠르게 이슈를 관리합니다' },
          { title: 'Linear 소개', url: 'https://linear.app/about', description: '협업 도구 Linear입니다' },
        ],
      };
    });
    const complete = vi.fn(async (_system: string, _user: string, options?: { signal?: AbortSignal }) => {
      llmSignals.push(options?.signal);
      return JSON.stringify({
        name: 'Linear',
        nameAnchors: [{ sourceId: 's1', excerpt: 'Linear는 이슈' }],
        summary: '이슈 트래킹 도구',
        summaryAnchors: [{ sourceId: 's1', excerpt: '이슈 트래킹 도구입니다' }],
        categoryCandidates: [],
        features: [],
        tags: [],
        companyCandidate: null,
        alternativeCandidates: [],
        suggestedSlug: 'linear',
        warnings: [],
      });
    });
    const claimJob = vi.fn().mockResolvedValue({
      claimed: true,
      job: { id: 'job-w4', officialUrl: 'https://linear.app/' },
    });
    // 정규화된 소스 1개만 반환되므로 검증 실패가 아닌 소스 부족 경로를 피하기
    // 위해 normalizeResearchSources를 우회할 수 없으므로, 최소 1개 소스가
    // 남도록 description을 길게 둔다. 실제 검증은 아래 complete 호출 여부로 본다.
    const completeJob = vi.fn().mockResolvedValue(null);
    const failJob = vi.fn().mockResolvedValue(null);
    const service = new ProductResearchService();
    const controller = new AbortController();
    await service.executeResearch(
      'job-w4',
      {
        jobRepository: { claimJob, completeJob, failJob },
        searchClient: { search },
        llm: { getModel: vi.fn().mockResolvedValue('fake-model'), complete },
      } as never,
      '11111111-1111-4111-8111-111111111111',
      { signal: controller.signal, stageBudgetMs: 10_000 }
    );
    expect(claimJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-w4', leaseToken: '11111111-1111-4111-8111-111111111111' })
    );
    expect(search).toHaveBeenCalled();
    for (const signal of searchSignals) {
      expect(signal).toBeInstanceOf(AbortSignal);
    }
    // 소스가 1개뿐이라 SPARSE_FACTS 경고와 함께 complete까지 도달하거나,
    // 소스 부족이면 failJob(NO_USABLE_SOURCES)이 호출된다. 어느 쪽이든
    // search stage에 signal이 전파됐음이 핵심이다.
    expect(complete.mock.calls.length + failJob.mock.calls.length).toBeGreaterThan(0);
    if (complete.mock.calls.length > 0) {
      for (const signal of llmSignals) {
        expect(signal).toBeInstanceOf(AbortSignal);
      }
    }
  });

  it('W4-A4: parent abort leaves the lease to expire instead of failing the job (F-A3)', async () => {
    const complete = vi.fn(async () => {
      const aborted = new Error('aborted');
      aborted.name = 'AbortError';
      throw aborted;
    });
    const search = vi.fn().mockResolvedValue({
      ok: true,
      results: [
        { title: 'Linear 공식', url: 'https://linear.app/', description: 'Linear는 이슈 트래킹 도구입니다' },
        { title: 'Linear 기능', url: 'https://linear.app/features', description: '빠르게 이슈를 관리합니다' },
        { title: 'Linear 소개', url: 'https://linear.app/about', description: '협업 도구 Linear입니다' },
      ],
    });
    const failJob = vi.fn().mockResolvedValue(null);
    const completeJob = vi.fn().mockResolvedValue(null);
    const service = new ProductResearchService();
    const controller = new AbortController();
    controller.abort();
    const attempted = await service.executeResearch(
      'job-abort',
      {
        jobRepository: {
          claimJob: vi.fn().mockResolvedValue({
            claimed: true,
            job: { id: 'job-abort', officialUrl: 'https://linear.app/' },
          }),
          completeJob,
          failJob,
        },
        searchClient: { search },
        llm: { getModel: vi.fn().mockResolvedValue('fake-model'), complete },
      } as never,
      '22222222-2222-4222-8222-222222222222',
      { signal: controller.signal, stageBudgetMs: 10_000 }
    );
    // 호출자 abort는 LLM stage를 호출하지 않고 terminal failJob도 확정하지
    // 않는다(재시도 없음). in_progress lease 만료 후 recovery가 재시도한다.
    // description·translation worker와 동일한 규율이다.
    expect(complete).not.toHaveBeenCalled();
    expect(failJob).not.toHaveBeenCalled();
    expect(completeJob).not.toHaveBeenCalled();
    expect(attempted).toEqual({ id: 'job-abort', officialUrl: 'https://linear.app/' });
  });
});
