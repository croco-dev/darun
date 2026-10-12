import { Token } from 'typedi';
import type { ProductResearchJobEntity, ProductResearchJobStatus } from '../entities/ProductResearchJobEntity';

export const ProductResearchJobRepositoryToken = new Token<ProductResearchJobRepository>(
  'ProductResearchJobRepository'
);

export type ClaimProductResearchJobResult =
  { claimed: true; job: ProductResearchJobEntity } | { claimed: false; job: ProductResearchJobEntity | null };

export type RecoverableProductResearchJob = Pick<
  ProductResearchJobEntity,
  'id' | 'status' | 'leaseUntil' | 'attemptCount'
>;

export interface ProductResearchJobRepository {
  findById(id: string): Promise<ProductResearchJobEntity | null>;
  findByRequestKey(requestKey: string): Promise<ProductResearchJobEntity | null>;
  findByProductId(productId: string): Promise<ProductResearchJobEntity | null>;
  createPendingJob(input: { requestKey: string; officialUrl: string }): Promise<ProductResearchJobEntity>;
  /**
   * 실패한 작업을 CAS로 재대기시킨다. 현재 상태가 expectedStatuses 중 하나와
   * 일치할 때만 pending으로 전이하고 전이된 작업을 반환한다. 불일치 시 null.
   */
  requeueFailedJob(input: {
    jobId: string;
    expectedStatuses: ProductResearchJobStatus[];
  }): Promise<ProductResearchJobEntity | null>;
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
  /**
   * 복구 대상 조회. 큐 전송이 누락된 pending과 lease가 만료된
   * in_progress를 반환한다. recovery tick이 주기적으로 재발견한다.
   */
  findRecoverableJobs?(input: { now: Date; limit?: number }): Promise<ProductResearchJobEntity[]>;
}
