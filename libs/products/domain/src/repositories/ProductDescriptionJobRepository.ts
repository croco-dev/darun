import { Token } from 'typedi';
import type { ProductDescriptionJobEntity, ProductDescriptionJobStatus } from '../entities/ProductDescriptionJobEntity';

export const ProductDescriptionJobRepositoryToken = new Token<ProductDescriptionJobRepository>(
  'ProductDescriptionJobRepository'
);

export type UpdateProductDescriptionJobOptions = {
  commitBefore?: Date;
  message?: string | null;
  error?: string | null;
  evidenceHash?: string | null;
  evidenceHashVersion?: string | null;
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
    retryOfJobId?: string;
    status?: ProductDescriptionJobStatus;
    message?: string;
    evidenceHash?: string;
    baseDescriptionHash?: string;
  }): Promise<ProductDescriptionJobEntity>;

  findJobById(id: string): Promise<ProductDescriptionJobEntity | null>;

  /** Atomically claim a due pending or expired attempt, or fail an exhausted logical job. */
  claimJobLease(input: {
    jobId: string;
    leaseToken: string;
    leaseUntil: Date;
  }): Promise<ProductDescriptionJobEntity | null>;

  /** Candidate payload and terminal status are written by the same fenced statement. */
  completeJobLease(
    jobId: string,
    leaseToken: string,
    nextStatus: Extract<ProductDescriptionJobStatus, 'completed' | 'failed' | 'superseded'>,
    options?: UpdateProductDescriptionJobOptions
  ): Promise<ProductDescriptionJobEntity | null>;

  retryJobLease(jobId: string, leaseToken: string, error: string): Promise<ProductDescriptionJobEntity | null>;

  /** Reserve up to 25 due jobs with SKIP LOCKED; commit before sending SQS. */
  findRecoverableJobs(input: { now: Date; limit?: number }): Promise<ProductDescriptionJobEntity[]>;

  findJobs(options?: {
    status?: ProductDescriptionJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<ProductDescriptionJobEntity[]>;
}
