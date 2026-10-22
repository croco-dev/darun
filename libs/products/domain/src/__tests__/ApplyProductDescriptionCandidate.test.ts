import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import type { ProductDescriptionJobEntity } from '../entities/ProductDescriptionJobEntity';
import {
  ApplyProductDescriptionCandidate,
  type ProductDescriptionApplyTransaction,
} from '../usecases/ApplyProductDescriptionCandidate';

function fixture() {
  const product = new Product({
    id: 'prod-1',
    name: '토스',
    slug: 'toss',
    logoUrl: 'https://example.com/logo.png',
    summary: '금융',
    description: '<p>human</p>',
  });
  const job: ProductDescriptionJobEntity = {
    id: 'job-1',
    productId: product.id,
    status: 'completed',
    candidateHtml: '<p>stored candidate bytes</p>',
    evidenceHash: 'evidence',
    baseDescriptionHash: 'base',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const tx: ProductDescriptionApplyTransaction = {
    findLockedJob: vi.fn(async () => job),
    findLockedProduct: vi.fn(async () => product),
    assembleLocked: vi.fn(async () => ({ evidenceHash: 'evidence', baseDescriptionHash: 'base' })),
    applyLocked: vi.fn(async input => {
      product.update({ description: input.candidateHtml });
      return product;
    }),
    markAppliedIfUnappliedLocked: vi.fn(async (_id, date) => {
      job.appliedAt = date;
      return job;
    }),
  };
  return {
    product,
    job,
    tx,
    usecase: new ApplyProductDescriptionCandidate({ transaction: { run: async work => work(tx) } }),
  };
}

describe('ApplyProductDescriptionCandidate', () => {
  it('applies stored bytes once and returns alreadyApplied without revalidation on retry', async () => {
    const { usecase, product, tx } = fixture();
    expect((await usecase.execute({ jobId: 'job-1' })).alreadyApplied).toBe(false);
    expect(product.description).toBe('<p>stored candidate bytes</p>');
    expect((await usecase.execute({ jobId: 'job-1' })).alreadyApplied).toBe(true);
    expect(tx.applyLocked).toHaveBeenCalledTimes(1);
    expect(tx.assembleLocked).toHaveBeenCalledTimes(1);
  });

  it.each(['evidenceHash', 'baseDescriptionHash'] as const)('rejects changed %s before any write', async key => {
    const { usecase, tx, product } = fixture();
    vi.mocked(tx.assembleLocked).mockResolvedValue({
      evidenceHash: 'evidence',
      baseDescriptionHash: 'base',
      [key]: 'changed',
    });
    await expect(usecase.execute({ jobId: 'job-1' })).rejects.toThrow('다시 생성해 주세요');
    expect(product.description).toBe('<p>human</p>');
    expect(tx.applyLocked).not.toHaveBeenCalled();
    expect(tx.markAppliedIfUnappliedLocked).not.toHaveBeenCalled();
  });

  it('rejects missing, unfinished and missing-product jobs', async () => {
    const { usecase, tx, job } = fixture();
    vi.mocked(tx.findLockedJob).mockResolvedValueOnce(null);
    await expect(usecase.execute({ jobId: 'missing' })).rejects.toThrow('존재하지 않는');
    job.status = 'failed';
    await expect(usecase.execute({ jobId: job.id })).rejects.toThrow('완료된');
    job.status = 'completed';
    vi.mocked(tx.findLockedProduct).mockResolvedValueOnce(null);
    await expect(usecase.execute({ jobId: job.id })).rejects.toThrow();
    expect(tx.applyLocked).not.toHaveBeenCalled();
  });

  it('fails the transaction if its conditional marker unexpectedly loses ownership', async () => {
    const { usecase, tx } = fixture();
    vi.mocked(tx.markAppliedIfUnappliedLocked).mockResolvedValue(null);
    await expect(usecase.execute({ jobId: 'job-1' })).rejects.toThrow('상태가 변경');
  });
});
