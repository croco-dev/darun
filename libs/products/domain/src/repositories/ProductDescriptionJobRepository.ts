import { Token } from 'typedi';
import type { ProductDescriptionJobEntity, ProductDescriptionJobStatus } from '../entities/ProductDescriptionJobEntity';

export const ProductDescriptionJobRepositoryToken = new Token<ProductDescriptionJobRepository>(
  'ProductDescriptionJobRepository'
);

export interface ProductDescriptionJobRepository {
  createJob(job: {
    productId: string;
    status?: ProductDescriptionJobStatus;
    message?: string;
  }): Promise<ProductDescriptionJobEntity>;

  findJobById(id: string): Promise<ProductDescriptionJobEntity | null>;

  updateJobStatus(
    id: string,
    status: ProductDescriptionJobStatus,
    options?: { message?: string | null; error?: string | null }
  ): Promise<ProductDescriptionJobEntity>;
}
