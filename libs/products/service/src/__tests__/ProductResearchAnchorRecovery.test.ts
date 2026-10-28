import type { ProductResearchDraftV1 } from '@darun/products-domain';
import { JOB_COMMIT_MARGIN_MS, RetryableError } from '@darun/utils-llm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductResearchService } from '../ProductResearchService';

function fixture() {
  const anchor = { sourceId: 's1', excerpt: 'Linear는 이슈 트래킹 도구입니다' };
  const payload = {
    name: 'Linear',
    nameAnchors: [anchor],
    summary: '이슈 트래킹 도구',
    summaryAnchors: [anchor],
    categoryCandidates: [],
    features: Array.from({ length: 5 }, (_, index) => ({
      name: `기능 ${index + 1}`,
      summary: `이슈 관리 ${index + 1}`,
      emoji: '✨',
      anchors: [anchor],
    })),
    tags: ['협업'],
    companyCandidate: {
      name: 'Linear 회사',
      website: 'https://linear.app/',
      anchors: [anchor],
    },
    alternativeCandidates: [],
    suggestedSlug: 'linear',
    warnings: [],
  };
  const invalid = structuredClone(payload);
  invalid.companyCandidate.anchors = [{ sourceId: 's1', excerpt: '출처에 없는 회사 설명' }];
  const job = {
    id: 'anchor-job',
    officialUrl: 'https://linear.app/',
    leaseUntil: new Date(Date.now() + 300_000),
  };
  const complete = vi.fn(async (_system: string, _user: string, _options?: { signal?: AbortSignal }) =>
    JSON.stringify(payload)
  );
  complete.mockResolvedValueOnce(JSON.stringify(invalid));
  const deps = {
    jobRepository: {
      claimJob: vi.fn().mockResolvedValue({ claimed: true, job }),
      completeJob: vi.fn(async (input: { result: ProductResearchDraftV1 }) => input.result),
      failJob: vi.fn().mockResolvedValue(null),
      retryJobLease: vi.fn().mockResolvedValue(null),
    },
    searchClient: {
      search: vi.fn().mockResolvedValue({
        ok: true,
        results: [
          {
            title: 'Linear 공식',
            url: 'https://linear.app/',
            description: 'Linear는 이슈 트래킹 도구입니다',
          },
        ],
      }),
    },
    llm: { getModel: vi.fn().mockResolvedValue('fixture-model'), complete },
  };
  const run = (options?: Parameters<ProductResearchService['executeResearch']>[3]) =>
    new ProductResearchService().executeResearch(
      'anchor-job',
      deps as never,
      '11111111-1111-4111-8111-111111111111',
      options
    );
  return { payload, invalid, job, deps, complete, run };
}

afterEach(() => vi.useRealTimers());

describe('조사 인용문 교정', () => {
  it.each(['companyCandidate.anchors', 'features[4].anchors'])(
    '%s 불일치 뒤 같은 검색 근거와 실패 필드로 재생성하고 검증된 초안을 저장한다',
    async field => {
      const { payload, invalid, deps, complete, run } = fixture();
      if (field === 'features[4].anchors') {
        invalid.companyCandidate = payload.companyCandidate;
        invalid.features[4]!.anchors = [{ sourceId: 's1', excerpt: '출처에 없는 다섯 번째 기능' }];
      }
      complete.mockReset().mockResolvedValueOnce(JSON.stringify(invalid)).mockResolvedValue(JSON.stringify(payload));

      const result = await run();

      expect(complete).toHaveBeenCalledTimes(2);
      expect(deps.searchClient.search).toHaveBeenCalledTimes(5);
      const firstPrompt = complete.mock.calls[0]![1];
      const correctionPrompt = complete.mock.calls[1]![1];
      expect(correctionPrompt).toContain(firstPrompt.split('\n반드시')[0]!);
      expect(correctionPrompt).toContain(field);
      expect(result).toMatchObject({
        companyCandidate: payload.companyCandidate,
        features: payload.features,
        sources: [
          {
            id: 's1',
            url: 'https://linear.app/',
            snippet: 'Linear는 이슈 트래킹 도구입니다',
          },
        ],
        model: 'fixture-model',
      });
      expect(deps.jobRepository.completeJob).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          jobId: 'anchor-job',
          leaseToken: '11111111-1111-4111-8111-111111111111',
          result,
        })
      );
      expect(deps.jobRepository.failJob).not.toHaveBeenCalled();
      expect(deps.jobRepository.retryJobLease).not.toHaveBeenCalled();
    }
  );

  it('교정 후에도 없는 인용문은 두 번째 응답에서 실패하며 원문을 오류에 포함하지 않는다', async () => {
    const { invalid, deps, complete, run } = fixture();
    complete.mockReset().mockResolvedValue(JSON.stringify(invalid));

    await run();

    expect(complete).toHaveBeenCalledTimes(2);
    expect(deps.jobRepository.failJob).toHaveBeenCalledExactlyOnceWith({
      jobId: 'anchor-job',
      leaseToken: '11111111-1111-4111-8111-111111111111',
      errorCode: 'INVALID_GENERATION',
      errorMessage: 'companyCandidate.anchors의 발췌가 출처에 존재하지 않습니다.',
    });
    expect(deps.jobRepository.completeJob).not.toHaveBeenCalled();
    expect(deps.jobRepository.retryJobLease).not.toHaveBeenCalled();
  });

  it('정상 첫 응답에는 추가 호출이 없다', async () => {
    const { payload, deps, complete, run } = fixture();
    complete.mockReset().mockResolvedValue(JSON.stringify(payload));
    await run();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(deps.jobRepository.completeJob).toHaveBeenCalledTimes(1);
  });

  it.each(['JSON', '길이', '출처 ID'] as const)('교정 응답의 %s 오류도 전체 검증에서 거절한다', async kind => {
    const { payload, deps, complete, run } = fixture();
    if (kind === '길이') payload.features[0]!.summary = 'x'.repeat(301);
    if (kind === '출처 ID') payload.nameAnchors = [{ sourceId: 's99', excerpt: 'Linear는 이슈' }];
    complete.mockResolvedValue(kind === 'JSON' ? '{broken}' : JSON.stringify(payload));

    await run();

    expect(complete).toHaveBeenCalledTimes(2);
    expect(deps.jobRepository.completeJob).not.toHaveBeenCalled();
    expect(deps.jobRepository.failJob).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ errorCode: 'INVALID_GENERATION' })
    );
  });

  it('인용문 불일치가 아닌 검증 오류는 교정하지 않는다', async () => {
    const { payload, deps, complete, run } = fixture();
    payload.name = '';
    complete.mockReset().mockResolvedValue(JSON.stringify(payload));
    await run();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(deps.jobRepository.failJob).toHaveBeenCalledTimes(1);
    expect(deps.jobRepository.completeJob).not.toHaveBeenCalled();
  });

  it.each(['유효 응답', '불일치 응답', '예외'] as const)(
    '교정 중 caller abort 뒤 %s가 와도 terminal 상태를 기록하지 않는다',
    async kind => {
      const { payload, invalid, job, deps, complete, run } = fixture();
      const controller = new AbortController();
      complete.mockImplementation(async (_system, _user, options) => {
        expect(options?.signal).toBeInstanceOf(AbortSignal);
        controller.abort();
        expect(options?.signal?.aborted).toBe(true);
        if (kind === '예외') throw new Error('취소된 전송');
        return JSON.stringify(kind === '유효 응답' ? payload : invalid);
      });

      expect(await run({ signal: controller.signal })).toBe(job);

      expect(complete).toHaveBeenCalledTimes(2);
      expect(deps.jobRepository.completeJob).not.toHaveBeenCalled();
      expect(deps.jobRepository.failJob).not.toHaveBeenCalled();
      expect(deps.jobRepository.retryJobLease).not.toHaveBeenCalled();
    }
  );

  it.each(['deadline', 'lease'] as const)('%s 여유가 없으면 교정을 시작하거나 실패를 확정하지 않는다', async kind => {
    vi.useFakeTimers();
    const { invalid, job, deps, complete, run } = fixture();
    const boundary = Date.now() + JOB_COMMIT_MARGIN_MS + 500;
    if (kind === 'lease') job.leaseUntil = new Date(boundary);
    complete.mockReset().mockImplementation(async () => {
      vi.setSystemTime(boundary - JOB_COMMIT_MARGIN_MS);
      return JSON.stringify(invalid);
    });

    expect(await run(kind === 'deadline' ? { deadline: new Date(boundary) } : {})).toBe(job);

    expect(complete).toHaveBeenCalledTimes(1);
    expect(deps.jobRepository.completeJob).not.toHaveBeenCalled();
    expect(deps.jobRepository.failJob).not.toHaveBeenCalled();
    expect(deps.jobRepository.retryJobLease).not.toHaveBeenCalled();
  });

  it.each(['deadline', 'lease'] as const)(
    '%s에 도달한 교정은 전송을 중단하고 늦은 결과를 저장하지 않는다',
    async kind => {
      vi.useFakeTimers();
      const { payload, job, deps, complete, run } = fixture();
      const boundary = Date.now() + JOB_COMMIT_MARGIN_MS + 500;
      if (kind === 'lease') job.leaseUntil = new Date(boundary);
      let entered!: () => void;
      const enteredCorrection = new Promise<void>(resolve => (entered = resolve));
      let correctionSignal: AbortSignal | undefined;
      complete.mockImplementation(
        async (_system, _user, options) =>
          new Promise<string>(resolve => {
            correctionSignal = options?.signal;
            correctionSignal?.addEventListener('abort', () => resolve(JSON.stringify(payload)), { once: true });
            entered();
          })
      );

      const running = run(kind === 'deadline' ? { deadline: new Date(boundary) } : {});
      await enteredCorrection;
      await vi.advanceTimersByTimeAsync(500);

      expect(await running).toBe(job);
      expect(correctionSignal?.aborted).toBe(true);
      expect(complete).toHaveBeenCalledTimes(2);
      expect(deps.jobRepository.completeJob).not.toHaveBeenCalled();
      expect(deps.jobRepository.failJob).not.toHaveBeenCalled();
      expect(deps.jobRepository.retryJobLease).not.toHaveBeenCalled();
    }
  );

  it('교정은 첫 생성 뒤 남은 합성 시간만 사용한다', async () => {
    vi.useFakeTimers();
    const { invalid, deps, complete, run } = fixture();
    complete.mockReset().mockImplementationOnce(async () => {
      vi.setSystemTime(Date.now() + 600);
      return JSON.stringify(invalid);
    });
    let entered!: () => void;
    const enteredCorrection = new Promise<void>(resolve => (entered = resolve));
    let correctionSignal: AbortSignal | undefined;
    complete.mockImplementation(
      async (_system, _user, options) =>
        new Promise<string>((_resolve, reject) => {
          correctionSignal = options?.signal;
          correctionSignal?.addEventListener('abort', () => reject(new Error('전송 종료')), { once: true });
          entered();
        })
    );
    const running = run({ stageBudgetMs: 1000 });
    await enteredCorrection;
    await vi.advanceTimersByTimeAsync(399);
    expect(correctionSignal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await running;

    expect(correctionSignal?.aborted).toBe(true);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(deps.jobRepository.completeJob).not.toHaveBeenCalled();
    expect(deps.jobRepository.retryJobLease).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ errorCode: 'LLM_UNAVAILABLE' })
    );
  });

  it('교정 전 합성 시간이 소진되면 추가 호출 없이 인용문 실패를 기록한다', async () => {
    vi.useFakeTimers();
    const { invalid, deps, complete, run } = fixture();
    complete.mockReset().mockImplementation(async () => {
      vi.setSystemTime(Date.now() + 1000);
      return JSON.stringify(invalid);
    });
    await run({ stageBudgetMs: 1000 });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(deps.jobRepository.completeJob).not.toHaveBeenCalled();
    expect(deps.jobRepository.failJob).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ errorCode: 'INVALID_GENERATION' })
    );
  });

  it('교정 호출의 공급자 장애는 추가 교정 없이 기존 작업 재시도로 전달한다', async () => {
    const { deps, complete, run } = fixture();
    complete.mockRejectedValue(new RetryableError('합성 공급자 장애', 503));
    await run();
    expect(complete).toHaveBeenCalledTimes(2);
    expect(deps.jobRepository.completeJob).not.toHaveBeenCalled();
    expect(deps.jobRepository.failJob).not.toHaveBeenCalled();
    expect(deps.jobRepository.retryJobLease).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ errorCode: 'LLM_UNAVAILABLE' })
    );
  });
});
