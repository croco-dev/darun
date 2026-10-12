import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import type { ProductDescriptionJobEntity } from '../entities/ProductDescriptionJobEntity';
import type { ProductDescriptionJobRepository } from '../repositories/ProductDescriptionJobRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import type { IProductDescriptionEvidenceAssembler } from '../services/ProductDescriptionEvidenceAssembler';
import {
  ApplyProductDescriptionCandidate,
  type ProductDescriptionApplyStore,
} from '../usecases/ApplyProductDescriptionCandidate';

function createMockProductRepo(): Pick<ProductRepository, 'findOneById' | 'updateById'> {
  return { findOneById: vi.fn(), updateById: vi.fn() };
}

function createMockJobRepo(): Pick<ProductDescriptionJobRepository, 'findJobById' | 'markApplied'> {
  return { findJobById: vi.fn(), markApplied: vi.fn() };
}

function createMockAssembler(): IProductDescriptionEvidenceAssembler {
  return { assemble: vi.fn() };
}

describe('ApplyProductDescriptionCandidate', () => {
  const mockProduct = new Product({
    id: 'prod-1',
    name: '토스',
    slug: 'toss',
    logoUrl: 'https://example.com/logo.png',
    summary: '간편 금융',
    description: '<p>기존 설명</p>',
  });

  const mockCompletedJob: ProductDescriptionJobEntity = {
    id: 'job-1',
    productId: 'prod-1',
    status: 'completed',
    candidateHtml: '<p>AI 생성 설명</p>',
    evidenceHash: 'ev-hash-1',
    baseDescriptionHash: 'base-desc-hash-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('successfully applies candidate to product description and marks job applied', async () => {
    const productRepo = createMockProductRepo();
    const jobRepo = createMockJobRepo();
    const assembler = createMockAssembler();

    vi.mocked(jobRepo.findJobById).mockResolvedValue(mockCompletedJob);
    vi.mocked(productRepo.findOneById).mockResolvedValue(mockProduct);
    vi.mocked(assembler.assemble).mockResolvedValue({
      evidence: { productId: 'prod-1', productName: '토스', items: [] },
      evidenceHash: 'ev-hash-1',
      baseDescriptionHash: 'base-desc-hash-1',
    });
    vi.mocked(productRepo.updateById).mockImplementation(async (_id, modifier) => modifier(mockProduct));
    vi.mocked(jobRepo.markApplied).mockResolvedValue({
      ...mockCompletedJob,
      appliedAt: new Date(),
    });

    const usecase = new ApplyProductDescriptionCandidate(productRepo as never, jobRepo as never, assembler);
    const result = await usecase.execute({ jobId: 'job-1' });

    expect(result.product.description).toBe('<p>AI 생성 설명</p>');
    expect(result.alreadyApplied).toBe(false);
    expect(jobRepo.markApplied).toHaveBeenCalledWith('job-1', expect.any(Date));
  });

  it('applies stored v1 candidate HTML byte-identical without re-rendering', async () => {
    const productRepo = createMockProductRepo();
    const jobRepo = createMockJobRepo();
    const assembler = createMockAssembler();

    const storedV1Html = '<h3>구 소개 제목</h3><p>구 렌더러로 만든 후보</p><p><em>2026년 9월 - Editor. DAO</em></p>';
    const v1Job: ProductDescriptionJobEntity = {
      ...mockCompletedJob,
      candidateHtml: storedV1Html,
    };

    vi.mocked(jobRepo.findJobById).mockResolvedValue(v1Job);
    vi.mocked(productRepo.findOneById).mockResolvedValue(mockProduct);
    vi.mocked(assembler.assemble).mockResolvedValue({
      evidence: { productId: 'prod-1', productName: '토스', items: [] },
      evidenceHash: 'ev-hash-1',
      baseDescriptionHash: 'base-desc-hash-1',
    });
    vi.mocked(productRepo.updateById).mockImplementation(async (_id, modifier) => modifier(mockProduct));
    vi.mocked(jobRepo.markApplied).mockResolvedValue({
      ...v1Job,
      appliedAt: new Date(),
    });

    const usecase = new ApplyProductDescriptionCandidate(productRepo as never, jobRepo as never, assembler);
    const result = await usecase.execute({ jobId: 'job-1' });

    expect(result.product.description).toBe(storedV1Html);
    expect(result.alreadyApplied).toBe(false);
  });

  it('is idempotent when already applied', async () => {
    const productRepo = createMockProductRepo();
    const jobRepo = createMockJobRepo();
    const assembler = createMockAssembler();

    const alreadyAppliedJob = {
      ...mockCompletedJob,
      appliedAt: new Date(),
    };

    vi.mocked(jobRepo.findJobById).mockResolvedValue(alreadyAppliedJob);
    vi.mocked(productRepo.findOneById).mockResolvedValue(mockProduct);

    const usecase = new ApplyProductDescriptionCandidate(productRepo as never, jobRepo as never, assembler);
    const result = await usecase.execute({ jobId: 'job-1' });

    expect(result.alreadyApplied).toBe(true);
    expect(productRepo.updateById).not.toHaveBeenCalled();
    expect(jobRepo.markApplied).not.toHaveBeenCalled();
  });

  it('rejects apply if evidence changed after candidate was generated', async () => {
    const productRepo = createMockProductRepo();
    const jobRepo = createMockJobRepo();
    const assembler = createMockAssembler();

    vi.mocked(jobRepo.findJobById).mockResolvedValue(mockCompletedJob);
    vi.mocked(productRepo.findOneById).mockResolvedValue(mockProduct);
    vi.mocked(assembler.assemble).mockResolvedValue({
      evidence: { productId: 'prod-1', productName: '토스', items: [] },
      evidenceHash: 'ev-hash-CHANGED',
      baseDescriptionHash: 'base-desc-hash-1',
    });

    const usecase = new ApplyProductDescriptionCandidate(productRepo as never, jobRepo as never, assembler);
    await expect(usecase.execute({ jobId: 'job-1' })).rejects.toThrow(
      '제품 정보가 생성 이후 변경되어 이 초안을 적용할 수 없습니다. 다시 생성해 주세요.'
    );
    expect(productRepo.updateById).not.toHaveBeenCalled();
  });

  it('rejects apply if canonical description was manually edited after candidate was generated', async () => {
    const productRepo = createMockProductRepo();
    const jobRepo = createMockJobRepo();
    const assembler = createMockAssembler();

    vi.mocked(jobRepo.findJobById).mockResolvedValue(mockCompletedJob);
    vi.mocked(productRepo.findOneById).mockResolvedValue(mockProduct);
    vi.mocked(assembler.assemble).mockResolvedValue({
      evidence: { productId: 'prod-1', productName: '토스', items: [] },
      evidenceHash: 'ev-hash-1',
      baseDescriptionHash: 'base-desc-hash-CHANGED',
    });

    const usecase = new ApplyProductDescriptionCandidate(productRepo as never, jobRepo as never, assembler);
    await expect(usecase.execute({ jobId: 'job-1' })).rejects.toThrow(
      '제품 정보가 생성 이후 변경되어 이 초안을 적용할 수 없습니다. 다시 생성해 주세요.'
    );
    expect(productRepo.updateById).not.toHaveBeenCalled();
  });

  it('rejects apply if job is not completed', async () => {
    const productRepo = createMockProductRepo();
    const jobRepo = createMockJobRepo();
    const assembler = createMockAssembler();

    vi.mocked(jobRepo.findJobById).mockResolvedValue({
      ...mockCompletedJob,
      status: 'pending',
      candidateHtml: null,
    });

    const usecase = new ApplyProductDescriptionCandidate(productRepo as never, jobRepo as never, assembler);
    await expect(usecase.execute({ jobId: 'job-1' })).rejects.toThrow(
      '적용 가능한 완료된 AI 소개 초안이 존재하지 않습니다.'
    );
  });

  it('resolves concurrent locked applies to one success plus stale alreadyApplied', async () => {
    const store: ProductDescriptionApplyStore = {
      transaction: { run: async <T>(work: () => Promise<T>) => work() },
      findLockedJob: vi.fn().mockResolvedValue(mockCompletedJob),
      findLockedProduct: vi.fn().mockResolvedValue(mockProduct),
      assembleLocked: vi.fn().mockResolvedValue({ evidenceHash: 'ev-hash-1', baseDescriptionHash: 'base-desc-hash-1' }),
      applyLocked: vi.fn().mockImplementation(async () => mockProduct),
      markAppliedIfUnappliedLocked: vi
        .fn()
        .mockResolvedValueOnce({ ...mockCompletedJob, appliedAt: new Date() })
        .mockResolvedValueOnce(null),
    };
    const runOnce = () =>
      new ApplyProductDescriptionCandidate({} as never, {} as never, {} as never, store).execute({ jobId: 'job-1' });
    const [first, second] = await Promise.all([runOnce(), runOnce()]);
    const flags = [first.alreadyApplied, second.alreadyApplied].sort();
    expect(flags).toEqual([false, true]);
    expect(store.applyLocked).toHaveBeenCalledTimes(2);
    expect(store.markAppliedIfUnappliedLocked).toHaveBeenCalledTimes(2);
  });

  it('rolls back the full locked transaction when the job marker fails after product update', async () => {
    const applied: string[] = [];
    const store: ProductDescriptionApplyStore = {
      transaction: {
        run: async <T>(work: () => Promise<T>) => {
          const checkpoint = applied.length;
          try {
            return await work();
          } catch (error) {
            applied.length = checkpoint;
            throw error;
          }
        },
      },
      findLockedJob: vi.fn().mockResolvedValue(mockCompletedJob),
      findLockedProduct: vi.fn().mockResolvedValue(mockProduct),
      assembleLocked: vi.fn().mockResolvedValue({ evidenceHash: 'ev-hash-1', baseDescriptionHash: 'base-desc-hash-1' }),
      applyLocked: vi.fn().mockImplementation(async () => {
        applied.push('<p>AI 생성 설명</p>');
        return mockProduct;
      }),
      markAppliedIfUnappliedLocked: vi.fn().mockRejectedValue(new Error('injected job-marker failure')),
    };
    const usecase = new ApplyProductDescriptionCandidate({} as never, {} as never, {} as never, store);
    await expect(usecase.execute({ jobId: 'job-1' })).rejects.toThrow('injected job-marker failure');
    expect(applied).toEqual([]);
  });

  it('blocks stale locked applies after a human edit and preserves the edit', async () => {
    const store: ProductDescriptionApplyStore = {
      transaction: { run: async <T>(work: () => Promise<T>) => work() },
      findLockedJob: vi.fn().mockResolvedValue(mockCompletedJob),
      findLockedProduct: vi.fn().mockResolvedValue(mockProduct),
      assembleLocked: vi
        .fn()
        .mockResolvedValue({ evidenceHash: 'ev-hash-1', baseDescriptionHash: 'base-desc-hash-CHANGED' }),
      applyLocked: vi.fn(),
      markAppliedIfUnappliedLocked: vi.fn(),
    };
    const usecase = new ApplyProductDescriptionCandidate({} as never, {} as never, {} as never, store);
    await expect(usecase.execute({ jobId: 'job-1' })).rejects.toThrow(
      '제품 정보가 생성 이후 변경되어 이 초안을 적용할 수 없습니다. 다시 생성해 주세요.'
    );
    expect(store.applyLocked).not.toHaveBeenCalled();
    expect(store.markAppliedIfUnappliedLocked).not.toHaveBeenCalled();
  });
});
