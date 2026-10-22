import { Inject, Service, Token } from 'typedi';
import type { Product } from '../entities/Product';
import type { ProductDescriptionJobEntity } from '../entities/ProductDescriptionJobEntity';
import { productNotFound } from '../errors/productError';

export interface ProductDescriptionApplyTransaction {
  findLockedJob(jobId: string): Promise<ProductDescriptionJobEntity | null>;
  findLockedProduct(productId: string): Promise<Product | null>;
  assembleLocked(productId: string): Promise<{ evidenceHash: string; baseDescriptionHash: string }>;
  applyLocked(input: { productId: string; candidateHtml: string }): Promise<Product>;
  markAppliedIfUnappliedLocked(jobId: string, appliedAt: Date): Promise<ProductDescriptionJobEntity | null>;
}

export interface ProductDescriptionApplyStore {
  transaction: {
    run<T>(work: (transaction: ProductDescriptionApplyTransaction) => Promise<T>): Promise<T>;
  };
}

export const ProductDescriptionApplyStoreToken = new Token<ProductDescriptionApplyStore>(
  'ProductDescriptionApplyStore'
);

export type ApplyProductDescriptionCandidateResult = {
  product: Product;
  job: ProductDescriptionJobEntity;
  alreadyApplied: boolean;
};

@Service()
export class ApplyProductDescriptionCandidate {
  constructor(
    @Inject(ProductDescriptionApplyStoreToken)
    private readonly applyStore: ProductDescriptionApplyStore
  ) {}

  execute({ jobId }: { jobId: string }): Promise<ApplyProductDescriptionCandidateResult> {
    return this.applyStore.transaction.run(async store => {
      const job = await store.findLockedJob(jobId);
      if (!job) {
        throw new Error(`존재하지 않는 AI 소개 생성 작업입니다: ${jobId}`);
      }
      if (job.status !== 'completed' || !job.candidateHtml) {
        throw new Error('적용 가능한 완료된 AI 소개 초안이 존재하지 않습니다.');
      }
      const product = await store.findLockedProduct(job.productId);
      if (!product) {
        throw productNotFound();
      }
      if (job.appliedAt) {
        return { product, job, alreadyApplied: true };
      }
      const snapshot = await store.assembleLocked(job.productId);
      if (snapshot.evidenceHash !== job.evidenceHash || snapshot.baseDescriptionHash !== job.baseDescriptionHash) {
        throw new Error('제품 정보가 생성 이후 변경되어 이 초안을 적용할 수 없습니다. 다시 생성해 주세요.');
      }
      const updatedProduct = await store.applyLocked({ productId: job.productId, candidateHtml: job.candidateHtml });
      const updatedJob = await store.markAppliedIfUnappliedLocked(jobId, new Date());
      if (!updatedJob) {
        throw new Error('AI 소개 적용 작업 상태가 변경되었습니다.');
      }
      return { product: updatedProduct, job: updatedJob, alreadyApplied: false };
    });
  }
}
