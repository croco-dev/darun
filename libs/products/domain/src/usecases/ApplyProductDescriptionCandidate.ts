import { Inject, Service, Token } from 'typedi';
import type { Product } from '../entities/Product';
import type { ProductDescriptionJobEntity } from '../entities/ProductDescriptionJobEntity';
import { productDescriptionStaleCandidate } from '../errors/productDescriptionError';
import { productNotFound } from '../errors/productError';
import type { AssembledProductDescriptionEvidence } from '../services/ProductDescriptionEvidenceProjector';

export interface ProductDescriptionApplyTransaction {
  run<T>(work: (store: ProductDescriptionApplySession) => Promise<T>): Promise<T>;
}

/** A session is owned by one transaction, never shared between requests. */
export interface ProductDescriptionApplySession {
  findJob(jobId: string, lock: boolean): Promise<ProductDescriptionJobEntity | null>;
  findLockedProduct(productId: string): Promise<Product | null>;
  assembleLocked(productId: string): Promise<AssembledProductDescriptionEvidence>;
  applyLocked(input: { productId: string; candidateHtml: string }): Promise<Product>;
  markAppliedLocked(jobId: string, appliedAt: Date): Promise<ProductDescriptionJobEntity>;
}

export interface ProductDescriptionApplyStore {
  transaction: ProductDescriptionApplyTransaction;
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
  constructor(@Inject(ProductDescriptionApplyStoreToken) private readonly applyStore: ProductDescriptionApplyStore) {}

  async execute({ jobId }: { jobId: string }): Promise<ApplyProductDescriptionCandidateResult> {
    return this.applyStore.transaction.run(async store => {
      // The first read discovers the owner only. Revalidate the job after locking Product.
      const discovered = await store.findJob(jobId, false);
      if (!discovered) throw new Error(`존재하지 않는 AI 소개 생성 작업입니다: ${jobId}`);
      const product = await store.findLockedProduct(discovered.productId);
      if (!product) throw productNotFound();
      const job = await store.findJob(jobId, true);
      if (!job || job.productId !== product.id) throw productDescriptionStaleCandidate();
      // Historical application remains true even if the candidate/status or current body changed.
      if (job.appliedAt) return { product, job, alreadyApplied: true };
      if (job.status !== 'completed' || !job.candidateHtml) {
        throw new Error('적용 가능한 완료된 AI 소개 초안이 존재하지 않습니다.');
      }
      const snapshot = await store.assembleLocked(product.id);
      const evidenceMatches =
        job.evidenceHashVersion === 'v2'
          ? snapshot.evidenceHash === job.evidenceHash
          : job.evidenceHashVersion == null &&
            !snapshot.evidence.items.some(item => item.kind === 'link') &&
            snapshot.legacyEvidenceHash === job.evidenceHash;
      if (!evidenceMatches || snapshot.baseDescriptionHash !== job.baseDescriptionHash) {
        throw productDescriptionStaleCandidate();
      }
      const updatedProduct = await store.applyLocked({ productId: product.id, candidateHtml: job.candidateHtml });
      const updatedJob = await store.markAppliedLocked(job.id, new Date());
      return { product: updatedProduct, job: updatedJob, alreadyApplied: false };
    });
  }
}
