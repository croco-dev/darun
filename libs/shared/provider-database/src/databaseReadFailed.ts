import { createDomainError, type DomainError } from '@darun/utils-error';

/** Inspect driver codes through query wrappers without retaining SQL, parameters or causes. */
export function databaseReadFailed(error: unknown): DomainError {
  const seen = new Set<object>();
  let current = error;
  while (typeof current === 'object' && current !== null && !seen.has(current)) {
    seen.add(current);
    const code = 'code' in current ? current.code : undefined;
    if (
      typeof code === 'string' &&
      (code.startsWith('08') ||
        [
          '53300',
          '57P01',
          '57P02',
          '57P03',
          '57014',
          'ECONNREFUSED',
          'ECONNRESET',
          'ETIMEDOUT',
          'EPIPE',
          'EAI_AGAIN',
          'CONNECT_TIMEOUT',
          'CONNECTION_CLOSED',
          'CONNECTION_ENDED',
          'CONNECTION_DESTROYED',
        ].includes(code))
    ) {
      return createDomainError('database/read-unavailable', '작업을 조회하지 못했습니다. 잠시 후 다시 조회해 주세요.');
    }
    if (typeof code === 'string' && ['42P01', '42703', '42883', '3F000'].includes(code)) {
      return createDomainError(
        'database/read-schema-invalid',
        '작업 저장소의 구성을 확인해야 합니다. 관리자에게 문의해 주세요.'
      );
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return createDomainError(
    'database/read-failed',
    '작업을 조회하지 못했습니다. 문제가 계속되면 관리자에게 문의해 주세요.'
  );
}
