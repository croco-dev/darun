import { createDomainError, type DomainError } from '@darun/utils-error';

export enum ProductDescriptionError {
  EvidenceReadFailed = 'EVIDENCE_READ_FAILED',
  StaleCandidate = 'STALE_CANDIDATE',
}

/**
 * 근거 조회 장애. 정상 빈 근거([]/null)와 달리 조회 자체가 실패한 경우이며
 * 재시도 가능한 작업 실패로 전달된다. 원본 DB 오류는 관리자 응답에 노출하지 않는다.
 */
export const productDescriptionEvidenceReadFailed = (
  source: string,
  cause?: unknown
): DomainError & { retryable: true } =>
  Object.assign(
    createDomainError(
      ProductDescriptionError.EvidenceReadFailed,
      `소개 생성 근거 조회에 실패했습니다 (${source}). 잠시 후 다시 시도해 주세요.`
    ),
    { retryable: true as const, cause }
  );

/**
 * 저장된 후보가 현재 근거와 더 이상 일치하지 않아 적용할 수 없는 충돌.
 * 과거 적용 이력은 보존하고 새 생성을 안내한다.
 */
export const productDescriptionStaleCandidate = (): DomainError =>
  createDomainError(
    ProductDescriptionError.StaleCandidate,
    '제품 정보가 생성 이후 변경되어 이 초안을 적용할 수 없습니다. 다시 생성해 주세요.'
  );
