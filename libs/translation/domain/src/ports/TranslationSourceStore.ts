import { Token } from 'typedi';
import type { TranslationJobEntity } from '../entities/TranslationJobEntity';
import type { UpsertTranslationParams } from '../repositories/TranslationRepository';

export type TranslationEntityType = 'Product' | 'Magazine' | 'ProductFeature';
export interface TranslationSourceRequest {
  entityType: TranslationEntityType;
  entityId: string;
  /** null is only the persisted legacy Product bundle representation. */
  fields: string[] | null;
}
export interface TranslationSourceSnapshot extends TranslationSourceRequest {
  sourceHash: string;
  /** Product context used by bundle translation, even when only selected rows are requested. */
  product?: { name: string; summary: string; description: string };
  values: Array<{ entityType: TranslationEntityType; entityId: string; field: string; value: string }>;
}
export interface TranslationCommit {
  jobId: string;
  leaseToken: string;
  snapshot: TranslationSourceSnapshot;
  rows: UpsertTranslationParams[];
  model: string;
  promptVersion: string;
  deadline?: Date;
  signal?: AbortSignal;
}
export type TranslationCommitResult = 'completed' | 'superseded' | 'lease_lost';
export interface TranslationSourceStore {
  read(request: TranslationSourceRequest): Promise<TranslationSourceSnapshot>;
  commit(input: TranslationCommit): Promise<TranslationCommitResult>;
  /**
   * 실패한 job의 새 logical retry를 등록한다. Product 발행 동기화와 연결된 job이면
   * 최신 translation intent의 포인터 갱신까지 같은 commit에 저장해, 등록/포인터
   * 갱신 실패나 commit 전 중단이 새 runnable job을 남기지 않는다. 최신 intent가
   * 이전 job을 가리키지 않으면 포인터는 옮기지 않는다.
   */
  createRetryJob(previousJobId: string): Promise<TranslationJobEntity>;
}
export const TranslationSourceStoreToken = new Token<TranslationSourceStore>('TranslationSourceStore');

export const TRANSLATION_FIELDS: Record<TranslationEntityType, readonly string[]> = {
  Product: ['name', 'summary', 'description', 'features'],
  Magazine: ['title', 'summary', 'content'],
  ProductFeature: ['name', 'summary'],
};
export function translationFields(request: TranslationSourceRequest): string[] {
  if (request.fields === null) {
    if (request.entityType !== 'Product') throw new Error('Only legacy Product jobs may have NULL fields');
    return [...TRANSLATION_FIELDS.Product];
  }
  const fields = [...new Set(request.fields)];
  if (!fields.length || fields.some(field => !TRANSLATION_FIELDS[request.entityType].includes(field))) {
    throw new Error(`Invalid translation fields for ${request.entityType}`);
  }
  return fields;
}
