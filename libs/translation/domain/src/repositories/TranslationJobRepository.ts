import { Token } from 'typedi';
import type { TranslationJobEntity, TranslationJobStatus } from '../entities/TranslationJobEntity';

export const TranslationJobRepositoryToken = new Token<TranslationJobRepository>('TranslationJobRepository');

export interface TranslationJobRepository {
  createJob(job: {
    entityType: string;
    entityId: string;
    locale?: string;
    status?: TranslationJobStatus;
    message?: string;
    sourceHash?: string | null;
    model?: string | null;
    promptVersion?: string | null;
  }): Promise<TranslationJobEntity>;

  findJobById(id: string): Promise<TranslationJobEntity | null>;

  updateJobStatus(
    id: string,
    status: TranslationJobStatus,
    options?: {
      message?: string | null;
      error?: string | null;
      sourceHash?: string | null;
      model?: string | null;
      promptVersion?: string | null;
    }
  ): Promise<TranslationJobEntity>;

  /**
   * 조건부 상태 전이. 현재 상태가 expectedStatuses 중 하나일 때만 nextStatus로
   * 전이하고 전이된 작업을 반환한다. 조건 불일치 시 null을 반환한다.
   * 동시 중복 실행 중 선점 경쟁을 해소하는 데 사용한다.
   */
  claimJobStatus(
    id: string,
    expectedStatuses: TranslationJobStatus[],
    nextStatus: TranslationJobStatus,
    options?: {
      message?: string | null;
      error?: string | null;
      sourceHash?: string | null;
      model?: string | null;
      promptVersion?: string | null;
    }
  ): Promise<TranslationJobEntity | null>;

  findJobs(options?: {
    status?: TranslationJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<TranslationJobEntity[]>;
}
