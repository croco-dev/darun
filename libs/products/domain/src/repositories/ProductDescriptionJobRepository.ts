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

  /**
   * lease 소유권 기반 클레임. pending은 즉시 선점하고, in_progress는
   * lease 만료 시에만 재선점한다. leaseToken이 새 소유권을 식별한다.
   */
  claimJobLease?(input: {
    jobId: string;
    leaseToken: string;
    leaseUntil: Date;
  }): Promise<ProductDescriptionJobEntity | null>;

  /**
   * lease 소유권 기반 확정 쓰기. 현재 행의 leaseToken이 입력과 일치하고
   * 상태가 in_progress일 때만 nextStatus로 전이하고 전이된 작업을 반환한다.
   * 구 attempt의 늦은 쓰기와 이미 끝난 terminal 행 덮어쓰기는 null로 거부된다(fence).
   */
  completeJobLease?(
    jobId: string,
    leaseToken: string,
    nextStatus: Extract<ProductDescriptionJobStatus, 'completed' | 'failed' | 'superseded'>,
    options?: UpdateProductDescriptionJobOptions
  ): Promise<ProductDescriptionJobEntity | null>;

  /**
   * 복구 대상 조회. 큐 전송이 누락된 pending과 lease가 만료된
   * in_progress를 반환한다. recovery tick이 주기적으로 재발견한다.
   */
  findRecoverableJobs?(input: { now: Date; limit?: number }): Promise<ProductDescriptionJobEntity[]>;

  markApplied(id: string, appliedAt: Date): Promise<ProductDescriptionJobEntity>;

  findJobs(options?: {
    status?: ProductDescriptionJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<ProductDescriptionJobEntity[]>;
}
