import { Inject, Service, Token } from 'typedi';
import type { Product } from '../entities/Product';
import type { ProductDescriptionJobEntity } from '../entities/ProductDescriptionJobEntity';
import { productNotFound } from '../errors/productError';
import type { ProductDescriptionJobRepository } from '../repositories/ProductDescriptionJobRepository';
import { ProductDescriptionJobRepositoryToken } from '../repositories/ProductDescriptionJobRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import {
  type IProductDescriptionEvidenceAssembler,
  ProductDescriptionEvidenceAssemblerToken,
} from '../services/ProductDescriptionEvidenceAssembler';

export interface ProductDescriptionApplyTransaction {
  run<T>(work: () => Promise<T>): Promise<T>;
}

/**
 * 후보 적용을 위한 좁은 트랜잭션 어댑터. 잠금 순서는 job row → product row로 통일하고
 * 하나의 트랜잭션 안에서 스냅샷 검증·product 쓰기·job 확정을 수행한다.
 * 구현은 assembleLocked/applyLocked/markAppliedLocked/markAppliedIfUnappliedLocked를
 * 호출한 트랜잭션 안에서 수행해야 한다(동일 커넥션/트랜잭션).
 */
export interface ProductDescriptionApplyStore {
  transaction: ProductDescriptionApplyTransaction;
  findLockedJob(jobId: string): Promise<ProductDescriptionJobEntity | null>;
  findLockedProduct(productId: string): Promise<Product | null>;
  assembleLocked(productId: string): Promise<{ evidenceHash: string; baseDescriptionHash: string }>;
  applyLocked(input: { productId: string; candidateHtml: string }): Promise<Product>;
  markAppliedIfUnappliedLocked(jobId: string, appliedAt: Date): Promise<ProductDescriptionJobEntity | null>;
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
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    @Inject(ProductDescriptionJobRepositoryToken)
    private readonly productDescriptionJobRepository: ProductDescriptionJobRepository,
    @Inject(ProductDescriptionEvidenceAssemblerToken)
    private readonly evidenceAssembler: IProductDescriptionEvidenceAssembler,
    @Inject(ProductDescriptionApplyStoreToken)
    private readonly applyStore?: ProductDescriptionApplyStore
  ) {}

  async execute({ jobId }: { jobId: string }): Promise<ApplyProductDescriptionCandidateResult> {
    if (this.applyStore) {
      return this.applyStore.transaction.run(async () => this.executeLocked(jobId));
    }
    return this.executeUnlocked(jobId);
  }

  private async executeLocked(jobId: string): Promise<ApplyProductDescriptionCandidateResult> {
    const store = this.applyStore as ProductDescriptionApplyStore;
    const job = await store.findLockedJob(jobId);
    if (!job) {
      throw new Error(`존재하지 않는 AI 소개 생성 작업입니다: ${jobId}`);
    }
    if (job.status !== 'completed' || !job.candidateHtml) {
      throw new Error('적용 가능한 완료된 AI 소개 초안이 존재하지 않습니다.');
    }
    // Idempotency: 동일 job의 동시 적용은 하나만 의미 있는 쓰기를 만든다.
    if (job.appliedAt) {
      const product = await store.findLockedProduct(job.productId);
      if (!product) {
        throw productNotFound();
      }
      return { product, job, alreadyApplied: true };
    }
    // 잠금 트랜잭션 구간 읽기: product row를 먼저 잠가 동시 human edit과
    // 직렬화한 뒤 같은 구간에서 스냅샷을 검증한다.
    // assembleLocked가 트랜잭션 밖 읽기를 쓰면 잠금 구간의 의미가 깨지므로
    // findLockedProduct를 먼저 호출해 행 잠금을 강제한다. product row 이외
    // feature/tag/link 등의 동시 변경은 이 잠금으로 직렬화되지 않는 잔여
    // 경계이며, 조건부 확정(markAppliedIfUnappliedLocked)만으로 막지 못한다.
    const lockedProduct = await store.findLockedProduct(job.productId);
    if (!lockedProduct) {
      throw productNotFound();
    }
    const snapshot = await store.assembleLocked(job.productId);
    if (snapshot.evidenceHash !== job.evidenceHash || snapshot.baseDescriptionHash !== job.baseDescriptionHash) {
      throw new Error('제품 정보가 생성 이후 변경되어 이 초안을 적용할 수 없습니다. 다시 생성해 주세요.');
    }
    const candidateHtml = job.candidateHtml;
    const updatedProduct = await store.applyLocked({ productId: job.productId, candidateHtml });
    // 같은 트랜잭션 안에서 조건부 확정: 동시 적용 경쟁은 하나만 성공한다.
    const updatedJob = await store.markAppliedIfUnappliedLocked(jobId, new Date());
    if (!updatedJob) {
      return { product: updatedProduct, job: { ...job, appliedAt: new Date() }, alreadyApplied: true };
    }
    return { product: updatedProduct, job: updatedJob, alreadyApplied: false };
  }

  private async executeUnlocked(jobId: string): Promise<ApplyProductDescriptionCandidateResult> {
    const job = await this.productDescriptionJobRepository.findJobById(jobId);
    if (!job) {
      throw new Error(`존재하지 않는 AI 소개 생성 작업입니다: ${jobId}`);
    }

    if (job.status !== 'completed' || !job.candidateHtml) {
      throw new Error('적용 가능한 완료된 AI 소개 초안이 존재하지 않습니다.');
    }

    const product = await this.productRepository.findOneById(job.productId);
    if (!product) {
      throw productNotFound();
    }

    // Idempotency: if already applied and description matches candidateHtml
    if (job.appliedAt) {
      return {
        product,
        job,
        alreadyApplied: true,
      };
    }

    // Re-check evidenceHash and baseDescriptionHash
    const currentSnapshot = await this.evidenceAssembler.assemble(product.id);

    if (
      currentSnapshot.evidenceHash !== job.evidenceHash ||
      currentSnapshot.baseDescriptionHash !== job.baseDescriptionHash
    ) {
      throw new Error('제품 정보가 생성 이후 변경되어 이 초안을 적용할 수 없습니다. 다시 생성해 주세요.');
    }

    const candidateHtml = job.candidateHtml;
    const updatedProduct = await this.productRepository.updateById(product.id, prevProduct => {
      prevProduct.update({ description: candidateHtml });
      return prevProduct;
    });

    const updatedJob = await this.productDescriptionJobRepository.markApplied(job.id, new Date());

    return {
      product: updatedProduct,
      job: updatedJob,
      alreadyApplied: false,
    };
  }
}
