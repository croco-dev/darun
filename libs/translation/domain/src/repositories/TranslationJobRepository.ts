import { Token } from 'typedi';
import type { TranslationJobEntity, TranslationJobStatus } from '../entities/TranslationJobEntity';
import type { TranslationEntityType } from '../ports/TranslationSourceStore';

export const TranslationJobRepositoryToken = new Token<TranslationJobRepository>('TranslationJobRepository');

export interface TranslationJobRepository {
  /** Atomically reuse or register a manual request with the same entity, locale and field set. */
  findOrCreateActiveJob(input: {
    entityType: TranslationEntityType;
    entityId: string;
    locale?: string;
    fields: string[];
  }): Promise<TranslationJobEntity>;

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

  /** Reserve up to 25 due jobs with SKIP LOCKED; commit before sending SQS. */
  findRecoverableJobs(input: { now: Date; limit?: number }): Promise<TranslationJobEntity[]>;

  findJobs(options?: {
    status?: TranslationJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<TranslationJobEntity[]>;
}
