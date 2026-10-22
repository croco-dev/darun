import { describe, expect, it, vi } from 'vitest';
import { ProductResearchService } from '../ProductResearchService';

describe('W9 review remediation: research abort and apply lock order', () => {
  it('F-A3: research AbortError and caller aborts return without terminal failJob', async () => {
    const aborted = new Error('작업이 중단되었습니다.');
    aborted.name = 'AbortError';
    const claimJob = vi.fn().mockResolvedValue({
      claimed: true,
      job: { id: 'job-w9-abort', officialUrl: 'https://linear.app/' },
    });
    const failJob = vi.fn().mockResolvedValue(null);
    const completeJob = vi.fn().mockResolvedValue(null);
    const search = vi.fn().mockResolvedValue({
      ok: true,
      results: [
        { title: 'Linear 공식', url: 'https://linear.app/', description: 'Linear는 이슈 트래킹 도구입니다' },
        { title: 'Linear 기능', url: 'https://linear.app/features', description: '빠르게 이슈를 관리합니다' },
        { title: 'Linear 소개', url: 'https://linear.app/about', description: '협업 도구 Linear입니다' },
      ],
    });
    const service = new ProductResearchService();
    const controller = new AbortController();
    controller.abort();

    const attempted = await service.executeResearch(
      'job-w9-abort',
      {
        jobRepository: { claimJob, completeJob, failJob },
        searchClient: { search },
        llm: { getModel: vi.fn().mockResolvedValue('fake-model'), complete: vi.fn() },
      } as never,
      '33333333-3333-4333-8333-333333333333',
      { signal: controller.signal, stageBudgetMs: 10_000 }
    );
    // 호출자 abort는 failJob 없이 claim된 job 그대로 반환해
    // in_progress lease 만료·recovery 재시도에 맡긴다.
    expect(failJob).not.toHaveBeenCalled();
    expect(completeJob).not.toHaveBeenCalled();
    expect(attempted).toEqual({ id: 'job-w9-abort', officialUrl: 'https://linear.app/' });
  });

  it('F-A3: LLM-stage AbortError also skips terminal failJob', async () => {
    const aborted = new Error('aborted by caller');
    aborted.name = 'AbortError';
    const claimJob = vi.fn().mockResolvedValue({
      claimed: true,
      job: { id: 'job-w9-llm-abort', officialUrl: 'https://linear.app/' },
    });
    const failJob = vi.fn().mockResolvedValue(null);
    const search = vi.fn().mockResolvedValue({
      ok: true,
      results: [
        { title: 'Linear 공식', url: 'https://linear.app/', description: 'Linear는 이슈 트래킹 도구입니다' },
        { title: 'Linear 기능', url: 'https://linear.app/features', description: '빠르게 이슈를 관리합니다' },
        { title: 'Linear 소개', url: 'https://linear.app/about', description: '협업 도구 Linear입니다' },
      ],
    });
    const complete = vi.fn().mockRejectedValue(aborted);
    const service = new ProductResearchService();

    await service.executeResearch(
      'job-w9-llm-abort',
      {
        jobRepository: { claimJob, completeJob: vi.fn(), failJob },
        searchClient: { search },
        llm: { getModel: vi.fn().mockResolvedValue('fake-model'), complete },
      } as never,
      '44444444-4444-4444-8444-444444444444',
      { stageBudgetMs: 10_000 }
    );
    expect(failJob).not.toHaveBeenCalled();
  });

  it('F-A5: locked apply reads the product row before the evidence snapshot', async () => {
    const { ApplyProductDescriptionCandidate } = await import('@darun/products-domain');
    const calls: string[] = [];
    const job = {
      id: 'job-w9-apply',
      productId: 'prod-w9',
      status: 'completed',
      candidateHtml: '<p>후보</p>',
      evidenceHash: 'ev',
      baseDescriptionHash: 'base',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const product = { id: 'prod-w9', description: '<p>기존</p>' };
    const store = {
      findLockedJob: vi.fn(async () => job),
      findLockedProduct: vi.fn(async () => {
        calls.push('findLockedProduct');
        return product;
      }),
      assembleLocked: vi.fn(async () => {
        calls.push('assembleLocked');
        return { evidenceHash: 'ev', baseDescriptionHash: 'base' };
      }),
      applyLocked: vi.fn(async () => product),
      markAppliedIfUnappliedLocked: vi.fn(async () => ({ ...job, appliedAt: new Date() })),
    };
    const usecase = new ApplyProductDescriptionCandidate({
      transaction: { run: async work => work(store as never) },
    });
    const result = await usecase.execute({ jobId: 'job-w9-apply' });
    expect(result.alreadyApplied).toBe(false);
    // 잠금 트랜잭션 구간 읽기 순서: product 행 잠금이 스냅샷 검증보다 먼저다.
    expect(calls).toEqual(['findLockedProduct', 'assembleLocked']);
  });
});
