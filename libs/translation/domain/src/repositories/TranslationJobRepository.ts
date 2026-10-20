import { Token } from 'typedi';
import type { TranslationJobEntity, TranslationJobStatus } from '../entities/TranslationJobEntity';

export const TranslationJobRepositoryToken = new Token<TranslationJobRepository>('TranslationJobRepository');

export interface TranslationJobRepository {
  createJob(job: {
    entityType: string;
    entityId: string;
    locale?: string;
    fields: string[];
    retryOfJobId?: string;
    idempotencyKey?: string;
    status?: 'pending';
    message?: string;
    sourceHash?: string | null;
    model?: string | null;
    promptVersion?: string | null;
  }): Promise<TranslationJobEntity>;

  findJobById(id: string): Promise<TranslationJobEntity | null>;

  /**
   * lease 소유권 기반 클레임. pending은 즉시 선점하고, in_progress는
   * lease 만료 시에만 재선점한다. leaseToken이 새 소유권을 식별한다.
   */
  claimJobLease(input: { jobId: string; leaseToken: string; leaseUntil: Date }): Promise<TranslationJobEntity | null>;

  /** Failure-only fenced transition; completed/superseded belong to TranslationSourceStore.commit. */
  completeJobLease(
    jobId: string,
    leaseToken: string,
    nextStatus: 'failed',
    options?: {
      message?: string | null;
      error?: string | null;
      sourceHash?: string | null;
      model?: string | null;
      promptVersion?: string | null;
    }
  ): Promise<TranslationJobEntity | null>;

  retryJobLease(jobId: string, leaseToken: string, error: string): Promise<TranslationJobEntity | null>;

  /**
   * 활성 intent 조회. 같은 entity·locale에 pending/in_progress job이 있으면
   * 반복 발행 동기화가 중복 job을 만들지 않고 기존 intent를 재사용한다.
   * 조회·생성 사이 경쟁은 기존처럼 유일 결과가 아닌 중복 허용으로 흡수되며,
   * recovery tick이 전송 누락분을 재발견한다.
   */
  findActiveJob?(input: {
    entityType: string;
    entityId: string;
    locale?: string;
  }): Promise<TranslationJobEntity | null>;

  /** Reserve up to 25 due jobs with SKIP LOCKED; commit before sending SQS. */
  findRecoverableJobs(input: { now: Date; limit?: number }): Promise<TranslationJobEntity[]>;

  findJobs(options?: {
    status?: TranslationJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<TranslationJobEntity[]>;
}
