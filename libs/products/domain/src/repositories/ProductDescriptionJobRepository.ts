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

  /**
   * 조건부 상태 전이. 현재 상태가 expectedStatuses 중 하나일 때만 nextStatus로
   * 전이하고 전이된 작업을 반환한다. 조건 불일치 시 null을 반환한다.
   * 동시 중복 실행 중 선점 경쟁을 해소하는 데 사용한다.
   */
  claimJobStatus(
    id: string,
    expectedStatuses: ProductDescriptionJobStatus[],
    nextStatus: ProductDescriptionJobStatus,
    options?: UpdateProductDescriptionJobOptions
  ): Promise<ProductDescriptionJobEntity | null>;

  markApplied(id: string, appliedAt: Date): Promise<ProductDescriptionJobEntity>;

  findJobs(options?: {
    status?: ProductDescriptionJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<ProductDescriptionJobEntity[]>;
}
