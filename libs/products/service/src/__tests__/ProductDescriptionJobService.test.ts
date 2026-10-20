import type { ProductDescriptionJobEntity, ProductDescriptionJobRepository } from '@darun/products-domain';
import { RetryableError } from '@darun/utils-llm';
import { describe, expect, it, vi } from 'vitest';
import { ProductDescriptionJobService } from '../ProductDescriptionJobService';

function fixture(status: ProductDescriptionJobEntity['status'] = 'pending') {
  const job: ProductDescriptionJobEntity = {
    id: 'old-job',
    productId: 'product',
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
    candidateHtml: '<p>Human candidate</p>',
    appliedAt: new Date('2026-09-01'),
  };
  const repository = {
    createJob: vi
      .fn()
      .mockResolvedValue({ ...job, id: 'new-job', status: 'pending', candidateHtml: null, appliedAt: null }),
    findJobById: vi.fn().mockResolvedValue(job),
    findJobs: vi.fn().mockResolvedValue([job]),
    claimJobLease: vi.fn().mockResolvedValue({ ...job, status: 'in_progress', leaseToken: 'attempt' }),
    completeJobLease: vi.fn().mockResolvedValue(null),
    retryJobLease: vi.fn().mockResolvedValue(null),
    findRecoverableJobs: vi.fn().mockResolvedValue([job]),
  };
  const candidate = {
    candidateHtml: '<p>Generated</p>',
    candidateDocument: { intro: { text: 'Intro', evidenceRefs: [] } },
    evidenceHash: 'evidence',
    evidenceHashVersion: 'v2',
    baseDescriptionHash: 'base',
    writerModel: 'fixture-model',
    reviewerModel: 'fixture-model',
    writerPromptVersion: 'writer',
    reviewerPromptVersion: 'reviewer',
    rendererVersion: 'renderer',
  };
  const generate = { execute: vi.fn().mockResolvedValue(candidate) };
  const product = { execute: vi.fn().mockResolvedValue({ id: 'product' }) };
  const queue = { sendJob: vi.fn().mockResolvedValue(true) };
  const service = new ProductDescriptionJobService(
    product as never,
    generate as never,
    repository as ProductDescriptionJobRepository,
    queue as never
  );
  return { job, repository, generate, product, queue, service, candidate };
}

describe('ProductDescriptionJobService durable attempts', () => {
  it('미존재 Product 요청은 job을 만들지 않는다', async () => {
    const f = fixture();
    f.product.execute.mockResolvedValueOnce(null);
    await expect(f.service.requestProductDescriptionJob('missing')).rejects.toThrow();
    expect(f.repository.createJob).not.toHaveBeenCalled();
  });
  it('queue 실패는 pending을 반환하고 동기 생성 대신 recovery로 재전송한다', async () => {
    const f = fixture();
    f.queue.sendJob.mockRejectedValueOnce(new Error('queue unavailable'));
    const result = await f.service.requestProductDescriptionJob({ id: 'product' });
    expect(result).toMatchObject({ job: { id: 'new-job', status: 'pending' }, queued: false });
    expect(f.generate.execute).not.toHaveBeenCalled();
    expect(await f.service.recoverInterruptedJobs()).toEqual({ recovered: 1, queued: 1 });
  });
  it('candidate 전체와 completed를 소유 token으로 한 번 전달한다', async () => {
    const f = fixture();
    await f.service.executeJob('old-job', 'product', { leaseToken: 'attempt' });
    expect(f.generate.execute).toHaveBeenCalledWith({ productId: 'product', signal: expect.any(AbortSignal) });
    expect(f.repository.completeJobLease).toHaveBeenCalledWith(
      'old-job',
      'attempt',
      'completed',
      expect.objectContaining({
        candidateHtml: '<p>Generated</p>',
        candidateDocument: JSON.stringify(f.candidate.candidateDocument),
        evidenceHashVersion: 'v2',
      })
    );
  });
  it('중복 claim 거절은 공급자 호출을 만들지 않는다', async () => {
    const f = fixture();
    f.repository.claimJobLease.mockResolvedValueOnce(null);
    await f.service.executeJob('old-job', 'product');
    expect(f.generate.execute).not.toHaveBeenCalled();
  });
  it.each([
    [new RetryableError('upstream', 503), 'retry'],
    [new Error('invalid generation'), 'failed'],
    [new Error('stale: changed source'), 'superseded'],
  ] as const)('오류 %s는 올바른 fenced 전이를 요청한다', async (error, target) => {
    const f = fixture();
    f.generate.execute.mockRejectedValueOnce(error);
    await f.service.executeJob('old-job', 'product', { leaseToken: 'attempt' });
    if (target === 'retry') {
      expect(f.repository.retryJobLease).toHaveBeenCalledWith('old-job', 'attempt', 'upstream');
      expect(f.repository.completeJobLease).not.toHaveBeenCalled();
    } else expect(f.repository.completeJobLease).toHaveBeenCalledWith('old-job', 'attempt', target, expect.any(Object));
  });
  it('부모 중단은 실제 생성 signal로 전달되며 완료나 실패를 쓰지 않는다', async () => {
    const f = fixture();
    const parent = new AbortController();
    let observed: AbortSignal | undefined;
    f.generate.execute.mockImplementationOnce(async ({ signal }: { signal: AbortSignal }) => {
      observed = signal;
      parent.abort();
      signal.throwIfAborted();
    });
    await f.service.executeJob('old-job', 'product', { signal: parent.signal });
    expect(observed?.aborted).toBe(true);
    expect(f.repository.completeJobLease).not.toHaveBeenCalled();
    expect(f.repository.retryJobLease).not.toHaveBeenCalled();
  });
  it('수동 failed retry는 새 job을 만들고 과거 candidate/appliedAt을 보존한다', async () => {
    const f = fixture('failed');
    const before = { ...f.job };
    const retry = await f.service.retryProductDescriptionJob('old-job');
    expect(f.repository.createJob).toHaveBeenCalledWith({ productId: 'product', retryOfJobId: 'old-job' });
    expect(retry.id).toBe('new-job');
    expect(f.job).toEqual(before);
    expect(f.queue.sendJob).toHaveBeenCalledWith({ jobId: 'new-job', productId: 'product' });
  });
  it.each(['completed', 'superseded', 'in_progress'] as const)('%s 수동 retry는 거절한다', async status => {
    const f = fixture(status);
    await expect(f.service.retryProductDescriptionJob('old-job')).rejects.toThrow(/재시도할 수 없는/);
    expect(f.repository.createJob).not.toHaveBeenCalled();
  });
  it('pending 재전송과 조회는 이력을 변경하지 않는다', async () => {
    const f = fixture();
    expect((await f.service.retryProductDescriptionJob('old-job')).id).toBe('old-job');
    expect(await f.service.getJob('old-job')).toBe(f.job);
    expect(await f.service.getJobs()).toEqual([f.job]);
    expect(f.repository.createJob).not.toHaveBeenCalled();
  });
  it('queue Product identity는 DB job과 일치해야 한다', async () => {
    const f = fixture();
    await expect(f.service.executeJob('old-job', 'other-product')).rejects.toThrow(/identity mismatch/);
    expect(f.repository.claimJobLease).not.toHaveBeenCalled();
  });
});
