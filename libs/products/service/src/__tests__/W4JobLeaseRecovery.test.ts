import {
  type ProductDescriptionJobEntity,
  type ProductDescriptionJobRepository,
  type ProductDescriptionJobStatus,
  type UpdateProductDescriptionJobOptions,
} from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { ProductDescriptionJobService } from '../ProductDescriptionJobService';

function jobEntity(overrides: Partial<ProductDescriptionJobEntity> = {}): ProductDescriptionJobEntity {
  return {
    id: 'job-1',
    productId: 'prod-1',
    status: 'pending',
    message: '대기 중',
    error: null,
    leaseToken: null,
    leaseUntil: null,
    attemptCount: 0,
    createdAt: new Date('2026-10-10T00:00:00Z'),
    updatedAt: new Date('2026-10-10T00:00:00Z'),
    ...overrides,
  };
}

function repository(overrides: Partial<ProductDescriptionJobRepository> = {}): ProductDescriptionJobRepository {
  return {
    createJob: vi.fn(),
    findJobById: vi.fn(),
    updateJobStatus: vi.fn(),
    claimJobStatus: vi.fn(),
    markApplied: vi.fn(),
    findJobs: vi.fn(),
    ...overrides,
  } as unknown as ProductDescriptionJobRepository;
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

describe('W4 job lease recovery: ProductDescriptionJobService', () => {
  it('W4-A1: only the owning leaseToken attempt commits; late older-attempt writes are rejected', async () => {
    const store = new Map<string, ProductDescriptionJobEntity>();
    store.set('job-1', jobEntity());
    const repo = repository({
      claimJobLease: vi.fn(async (input: { jobId: string; leaseToken: string }) => {
        const current = store.get(input.jobId)!;
        if (current.status !== 'pending') {
          return null;
        }
        const next = jobEntity({
          ...current,
          status: 'in_progress',
          leaseToken: input.leaseToken,
          attemptCount: (current.attemptCount ?? 0) + 1,
        });
        store.set(input.jobId, next);
        return next;
      }),
      completeJobLease: vi.fn(
        async (
          jobId: string,
          leaseToken: string,
          nextStatus: ProductDescriptionJobStatus,
          options?: UpdateProductDescriptionJobOptions
        ) => {
          const current = store.get(jobId)!;
          // DB 조건 fence: leaseToken 불일치 시 null (구 attempt 늦은 쓰기 거부).
          if (current.leaseToken !== leaseToken) {
            return null;
          }
          const next = jobEntity({ ...current, status: nextStatus, ...options });
          store.set(jobId, next);
          return next;
        }
      ),
    });
    const generate = { execute: vi.fn().mockResolvedValue(candidateResult) };
    const service = new ProductDescriptionJobService({ execute: vi.fn() } as never, generate as never, repo);

    // A가 선점하고 B는 선점에 실패한다(상태 경쟁 해소).
    await service.executeJob('job-1', 'prod-1', { leaseToken: 'lease-A' });
    expect(store.get('job-1')?.status).toBe('completed');
    expect(store.get('job-1')?.leaseToken).toBe('lease-A');

    // 구 attempt(lease 없음)의 늦은 확정 쓰기는 DB 조건에 거부된다.
    const late = await repo.completeJobLease!('job-1', 'lease-stale', 'completed', { message: 'late' });
    expect(late).toBeNull();
    expect(store.get('job-1')?.leaseToken).toBe('lease-A');

    // 재선점된 새 lease의 쓰기는 fence를 통과한다.
    store.set('job-1', jobEntity({ status: 'pending', leaseToken: null }));
    await service.executeJob('job-1', 'prod-1', { leaseToken: 'lease-B' });
    expect(store.get('job-1')?.leaseToken).toBe('lease-B');
  });

  it('W4-A2: recovery tick rediscovers enqueue-missed pending jobs without manual action', async () => {
    const pending = jobEntity({ id: 'job-pending' });
    const expired = jobEntity({
      id: 'job-expired',
      status: 'in_progress',
      leaseToken: 'lease-old',
      leaseUntil: new Date('2026-10-09T00:00:00Z'),
    });
    const repo = repository({
      findRecoverableJobs: vi.fn().mockResolvedValue([pending, expired]),
    });
    const sent: string[] = [];
    const queue = { sendJob: vi.fn(async (payload: { jobId: string }) => (sent.push(payload.jobId), true)) };
    const service = new ProductDescriptionJobService(
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      repo,
      queue as never
    );

    const result = await service.recoverInterruptedJobs({ now: new Date('2026-10-10T00:00:00Z') });
    expect(result).toEqual({ recovered: 2, queued: 2 });
    expect(sent).toEqual(['job-pending', 'job-expired']);
  });

  it('W4-A3: no setImmediate fallback; queue-send failure leaves retryable pending and reports queued=false', async () => {
    const created = jobEntity();
    const repo = repository({
      createJob: vi.fn().mockResolvedValue(created),
      findJobById: vi.fn().mockResolvedValue(created),
      updateJobStatus: vi.fn().mockResolvedValue(created),
      findRecoverableJobs: vi.fn().mockResolvedValue([]),
    });
    const queue = { sendJob: vi.fn().mockRejectedValue(new Error('SQS down')) };
    const getProduct = {
      execute: vi.fn().mockResolvedValue({ id: 'prod-1' }),
    };
    const service = new ProductDescriptionJobService(
      getProduct as never,
      { execute: vi.fn() } as never,
      repo,
      queue as never
    );

    const result = await service.requestProductDescriptionJob({ id: 'prod-1' });
    expect(result.queued).toBe(false);
    expect(result.job.status).toBe('pending');
    // 폴백 실행이 없으므로 generate는 호출되지 않고, 다음 tick이 재발견한다.
    expect(queue.sendJob).toHaveBeenCalledTimes(1);

    const recovered = await service.recoverInterruptedJobs({ now: new Date() });
    expect(recovered).toEqual({ recovered: 0, queued: 0 });

    const retried = { ...created, status: 'pending' as const };
    vi.mocked(repo.updateJobStatus).mockResolvedValue(retried);
    const retryResult = await service.retryProductDescriptionJob('job-1');
    expect(retryResult.queued).toBe(false);
    expect(retryResult.status).toBe('pending');
    expect(queue.sendJob).toHaveBeenCalledTimes(2);
  });

  it('W4-A4: abort leaves the lease to expire instead of failing the job', async () => {
    const current = jobEntity({ status: 'in_progress', leaseToken: 'lease-A' });
    const repo = repository({
      claimJobLease: vi.fn().mockResolvedValue(current),
      completeJobLease: vi.fn(),
    });
    const aborted = new Error('작업이 중단되었습니다.');
    aborted.name = 'AbortError';
    const generate = { execute: vi.fn().mockRejectedValue(aborted) };
    const controller = new AbortController();
    controller.abort();
    const service = new ProductDescriptionJobService({ execute: vi.fn() } as never, generate as never, repo);

    await service.executeJob('job-1', 'prod-1', { leaseToken: 'lease-A', signal: controller.signal });
    expect(repo.completeJobLease).not.toHaveBeenCalled();
  });
});
