import { Inject, Service } from 'typedi';
import type { Product } from '../entities/Product';
import type { ProductDescriptionJobEntity } from '../entities/ProductDescriptionJobEntity';
import { productNotFound } from '../errors/productError';
import type { ProductDescriptionJobRepository } from '../repositories/ProductDescriptionJobRepository';
import { ProductDescriptionJobRepositoryToken } from '../repositories/ProductDescriptionJobRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import {
  type IProductDescriptionEvidenceAssembler,
  ProductDescriptionEvidenceAssembler,
  ProductDescriptionEvidenceAssemblerToken,
} from '../services/ProductDescriptionEvidenceAssembler';

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
    private readonly evidenceAssembler: IProductDescriptionEvidenceAssembler
  ) {}

  async execute({ jobId }: { jobId: string }): Promise<ApplyProductDescriptionCandidateResult> {
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
