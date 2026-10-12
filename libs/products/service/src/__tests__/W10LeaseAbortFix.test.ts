import type {
  ProductDescriptionJobEntity,
  ProductDescriptionJobRepository,
} from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { ProductDescriptionJobService } from '../ProductDescriptionJobService';

function jobEntity(overrides: Partial<ProductDescriptionJobEntity> = {}): ProductDescriptionJobEntity {
  return {
    id: 'job-w10',
    productId: 'prod-w10',
    status: 'pending',
    message: '대기 중',
    error: null,
    leaseToken: null,
    leaseUntil: null,
    attemptCount: 0,
    createdAt: new Date('2026-10-11T00:00:00Z'),
    updatedAt: new Date('2026-10-11T00:00:00Z'),
    ...overrides,
  };
}

const candidateResult = {
  candidateHtml: '<p>후보</p>',
  candidateDocument: { intro: { text: '도입', evidenceRefs: [] } },
  evidenceHash: 'ev',
  baseDescriptionHash: 'base',
  writerModel: 'm',
  reviewerModel: 'm',
  writerPromptVersion: 'v1',
  reviewerPromptVersion: 'v1',
  rendererVersion: 'v1',
};

describe('W10 lease abort fix: description worker', () => {
  it('B-A1: completed 행은 늦은 completeJobLease 확정으로 덮어쓰지 않는다', async () => {
    const store = new Map<string, ProductDescriptionJobEntity>();
    store.set('job-w10', jobEntity({ status: 'completed', leaseToken: 'lease-old' }));
    const repository = {
      findJobById: vi.fn(async (id: string) => store.get(id) ?? null),
      completeJobLease: vi.fn(
        async (jobId: string, leaseToken: string, nextStatus: string, options?: Record<string, unknown>) => {
          const current = store.get(jobId)!;
          // DB 조건 fence: leaseToken 일치 + in_progress에서만 전이한다.
          if (current.leaseToken !== leaseToken || current.status !== 'in_progress') {
            return null;
          }
          const next = jobEntity({ ...current, status: nextStatus as never, ...(options as object) });
          store.set(jobId, next);
          return next;
        }
      ),
    } as unknown as ProductDescriptionJobRepository;

    const late = await repository.completeJobLease!('job-w10', 'lease-old', 'completed', { message: 'late' });
    expect(late).toBeNull();
    expect(store.get('job-w10')?.status).toBe('completed');
  });

  it('B-A1: executeJob은 terminal 재확인 뒤 outer completed를 건너뛴다', async () => {
    const repository = {
      claimJobLease: vi.fn().mockResolvedValue(jobEntity({ status: 'in_progress', leaseToken: 'lease-w10' })),
      // claim 뒤 같은 소유 토큰의 superseded 확정이 먼저 들어왔다고 가정한다.
      findJobById: vi.fn().mockResolvedValue(jobEntity({ status: 'superseded', leaseToken: 'lease-w10' })),
      completeJobLease: vi.fn(),
      updateJobStatus: vi.fn(),
      claimJobStatus: vi.fn(),
    } as unknown as ProductDescriptionJobRepository;
    const generate = { execute: vi.fn().mockResolvedValue(candidateResult) };
    const service = new ProductDescriptionJobService({ execute: vi.fn() } as never, generate as never, repository);

    await service.executeJob('job-w10', 'prod-w10', { leaseToken: 'lease-w10', stageBudgetMs: 5000 });
    expect(repository.completeJobLease).not.toHaveBeenCalled();
  });

  it('B-A2: 부모 abort가 worker deadline으로 전파되어 staged LLM 작업이 중단된다', async () => {
    const repository = {
      claimJobLease: vi.fn().mockResolvedValue(jobEntity({ status: 'in_progress', leaseToken: 'lease-w10' })),
      completeJobLease: vi.fn(),
    } as unknown as ProductDescriptionJobRepository;
    let observedSignal: AbortSignal | undefined;
    const generate = {
      execute: vi.fn(async (input: { productId: string; signal?: AbortSignal }) => {
        observedSignal = input.signal;
        // staged 작업은 전달된 signal을 존중해 중단된다.
        await new Promise<void>((resolve, reject) => {
          const signal = input.signal;
          if (!signal) {
            resolve();
            return;
          }
          if (signal.aborted) {
            const aborted = new Error('작업이 중단되었습니다.');
            aborted.name = 'AbortError';
            reject(aborted);
            return;
          }
          signal.addEventListener(
            'abort',
            () => {
              const aborted = new Error('작업이 중단되었습니다.');
              aborted.name = 'AbortError';
              reject(aborted);
            },
            { once: true }
          );
        });
        return candidateResult;
      }),
    };
    const service = new ProductDescriptionJobService({ execute: vi.fn() } as never, generate as never, repository);
    const controller = new AbortController();
    const pending = service.executeJob('job-w10', 'prod-w10', {
      leaseToken: 'lease-w10',
      signal: controller.signal,
      stageBudgetMs: 5000,
    });
    controller.abort();
    await pending;
    expect(generate.execute).toHaveBeenCalled();
    expect(observedSignal).toBeInstanceOf(AbortSignal);
    // 중단은 lease 만료·recovery에 맡기므로 확정 쓰기를 하지 않는다.
    expect(repository.completeJobLease).not.toHaveBeenCalled();
  });

  it('B-A3: 재시도는 failed만 조건부 전이로 pending 복귀하고 lease가 없는 completed는 거부한다', async () => {
    const completed = jobEntity({ id: 'job-done', status: 'completed', leaseToken: null });
    const claimJobStatus = vi.fn();
    const repository = {
      findJobById: vi.fn().mockResolvedValue(completed),
      claimJobStatus,
      updateJobStatus: vi.fn(),
    } as unknown as ProductDescriptionJobRepository;
    const service = new ProductDescriptionJobService(
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      repository,
      { sendJob: vi.fn() } as never
    );

    await expect(service.retryProductDescriptionJob('job-done')).rejects.toThrow('재시도할 수 없는');
    expect(claimJobStatus).not.toHaveBeenCalled();
  });

  it('B-A3: failed 재시도는 leaseToken을 보존한 채 조건부 전이한다', async () => {
    const failed = jobEntity({ id: 'job-failed', status: 'failed', leaseToken: 'lease-old' });
    const pending = jobEntity({ id: 'job-failed', status: 'pending', leaseToken: 'lease-old' });
    const claimJobStatus = vi.fn().mockResolvedValue(pending);
    const queue = { sendJob: vi.fn().mockResolvedValue(true) };
    const repository = {
      findJobById: vi.fn().mockResolvedValue(failed),
      claimJobStatus,
      updateJobStatus: vi.fn(),
    } as unknown as ProductDescriptionJobRepository;
    const service = new ProductDescriptionJobService(
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      repository,
      queue as never
    );

    const result = await service.retryProductDescriptionJob('job-failed');
    expect(claimJobStatus).toHaveBeenCalledWith('job-failed', ['failed'], 'pending', {
      message: 'AI 소개 생성 작업이 재시도 대기열에 등록되었습니다.',
      error: null,
      appliedAt: null,
    });
    expect(result.status).toBe('pending');
    expect(result.leaseToken).toBe('lease-old');
    expect(result.queued).toBe(true);
  });
});
