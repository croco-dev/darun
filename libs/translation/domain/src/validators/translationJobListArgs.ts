import { createDomainError } from '@darun/utils-error';
import type { TranslationJobStatus } from '../entities/TranslationJobEntity';

/** Shared by the API boundary and repositories; invalid input must never become an empty list. */
export function translationJobListArgs(options?: {
  status?: string | null;
  limit?: number | null;
  offset?: number | null;
}): { status?: TranslationJobStatus; limit: number; offset: number } {
  const status = options?.status ?? undefined;
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  if (
    status !== undefined &&
    status !== 'pending' &&
    status !== 'in_progress' &&
    status !== 'completed' &&
    status !== 'failed' &&
    status !== 'superseded'
  ) {
    throw createDomainError('translation/invalid-job-list-args', '지원하지 않는 번역 작업 상태입니다.');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createDomainError('translation/invalid-job-list-args', 'limit은 1 이상 100 이하의 정수여야 합니다.');
  }
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw createDomainError('translation/invalid-job-list-args', 'offset은 0 이상의 안전한 정수여야 합니다.');
  }
  return { status, limit, offset };
}
