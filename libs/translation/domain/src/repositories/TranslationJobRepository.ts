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
  }): Promise<TranslationJobEntity>;

  findJobById(id: string): Promise<TranslationJobEntity | null>;

  updateJobStatus(
    id: string,
    status: TranslationJobStatus,
    options?: { message?: string | null; error?: string | null; resetCreatedAt?: boolean }
  ): Promise<TranslationJobEntity>;

  findJobs(options?: {
    status?: TranslationJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<TranslationJobEntity[]>;
}
