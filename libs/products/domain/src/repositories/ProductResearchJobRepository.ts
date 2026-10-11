import { Token } from 'typedi';
import type { ProductResearchJobEntity } from '../entities/ProductResearchJobEntity';

export const ProductResearchJobRepositoryToken = new Token<ProductResearchJobRepository>(
  'ProductResearchJobRepository'
);

export type ClaimProductResearchJobResult =
  { claimed: true; job: ProductResearchJobEntity } | { claimed: false; job: ProductResearchJobEntity | null };

export interface ProductResearchJobRepository {
  findById(id: string): Promise<ProductResearchJobEntity | null>;
  findByRequestKey(requestKey: string): Promise<ProductResearchJobEntity | null>;
  findByProductId(productId: string): Promise<ProductResearchJobEntity | null>;
  createPendingJob(input: { requestKey: string; officialUrl: string }): Promise<ProductResearchJobEntity>;
  claimJob(input: { jobId: string; leaseToken: string; leaseUntil: Date }): Promise<ClaimProductResearchJobResult>;
  completeJob(input: {
    jobId: string;
    leaseToken: string;
    result: ProductResearchJobEntity['result'] & object;
    sourceSnapshotHash: string;
    promptVersion: string;
    model: string;
  }): Promise<ProductResearchJobEntity | null>;
  failJob(input: {
    jobId: string;
    leaseToken: string;
    errorCode: NonNullable<ProductResearchJobEntity['errorCode']>;
    errorMessage: string;
  }): Promise<ProductResearchJobEntity | null>;
  markMaterialized(input: { jobId: string; productId: string }): Promise<ProductResearchJobEntity | null>;
}
