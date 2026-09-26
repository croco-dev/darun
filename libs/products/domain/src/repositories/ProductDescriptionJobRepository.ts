import { Token } from 'typedi';
import type { ProductDescriptionJobEntity, ProductDescriptionJobStatus } from '../entities/ProductDescriptionJobEntity';

export const ProductDescriptionJobRepositoryToken = new Token<ProductDescriptionJobRepository>(
  'ProductDescriptionJobRepository'
);

export type UpdateProductDescriptionJobOptions = {
  message?: string | null;
  error?: string | null;
  evidenceHash?: string | null;
  baseDescriptionHash?: string | null;
  candidateDocument?: string | null;
  candidateHtml?: string | null;
  writerModel?: string | null;
  reviewerModel?: string | null;
  writerPromptVersion?: string | null;
  reviewerPromptVersion?: string | null;
  rendererVersion?: string | null;
  appliedAt?: Date | null;
};

export interface ProductDescriptionJobRepository {
  createJob(job: {
    productId: string;
    status?: ProductDescriptionJobStatus;
    message?: string;
    evidenceHash?: string;
    baseDescriptionHash?: string;
  }): Promise<ProductDescriptionJobEntity>;

  findJobById(id: string): Promise<ProductDescriptionJobEntity | null>;

  updateJobStatus(
    id: string,
    status: ProductDescriptionJobStatus,
    options?: UpdateProductDescriptionJobOptions
  ): Promise<ProductDescriptionJobEntity>;

  markApplied(id: string, appliedAt: Date): Promise<ProductDescriptionJobEntity>;

  findJobs(options?: {
    status?: ProductDescriptionJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<ProductDescriptionJobEntity[]>;
}
