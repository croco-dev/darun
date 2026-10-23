import { RetryableError } from '../withRetry';
import { DEFAULT_LLM_ENDPOINT } from './LlmModel';

/**
 * LLM 설정 조회 장애를 나타내는 retryable 오류.
 * 설정 저장소(DB) 조회 실패는 기본 설정으로 대체하지 않고 호출자에게 그대로 전달된다.
 */
export class LlmConfigReadFailedError extends RetryableError {
  readonly code = 'LLM_CONFIG_READ_FAILED';

  constructor() {
    super('저장된 LLM 설정을 읽지 못했습니다.');
    this.name = 'LlmConfigReadFailedError';
  }
}

export const LLM_DEFAULT_KEY_REJECTION_MESSAGE =
  '커스텀 엔드포인트에는 기본 환경 키(OPEN_ROUTER_API_KEY)를 사용할 수 없습니다. 해당 공급자 전용 키를 입력해주세요.';

export class LlmEndpointKeyError extends Error {
  readonly code = 'LLM_API_KEY_NOT_ALLOWED';

  constructor() {
    super(LLM_DEFAULT_KEY_REJECTION_MESSAGE);
    this.name = 'LlmEndpointKeyError';
  }
}

export type LlmEndpointKeyDecision =
  { allowed: true; apiKey: string | null } | { allowed: false; reason: 'default-key-not-allowed-for-custom-endpoint' };

/**
 * 엔드포인트 입력을 정확한 base URL로 정규화한다.
 * trailing slash와 끝의 `/models` 경로를 제거해 base와 `/models` 조회 경로를 구분한다.
 */
export function normalizeLlmEndpointBase(endpoint: string): string {
  let base = endpoint.trim();
  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  if (base.endsWith('/models')) {
    base = base.slice(0, -'/models'.length);
    while (base.endsWith('/')) {
      base = base.slice(0, -1);
    }
  }
  return base;
}

export function isOpenRouterDefaultEndpoint(endpoint: string): boolean {
  return normalizeLlmEndpointBase(endpoint) === DEFAULT_LLM_ENDPOINT;
}

/**
 * 한 기본 키 정책. 모든 LLM 요청 경로(모델 조회 프록시, completion 클라이언트, 설정 service)가 재사용한다.
 *
 * - base가 정확히 OpenRouter 기본값(`https://openrouter.ai/api/v1`)일 때만
 *   환경 기본 키(OPEN_ROUTER_API_KEY)를 fallback으로 사용할 수 있다.
 * - 커스텀 엔드포인트는 입력·저장된 별도 공급자 키만 사용한다. 모델 조회 키가 없으면
 *   키 없는 공개 조회(null)만 허용하고, completion 호출자는 요청 전에 실패해야 한다.
 * - 커스텀 엔드포인트에 명시된 키가 현재 환경 기본 키와 같으면 거절한다.
 *
 * 키 원문은 이 비교에만 사용하며 로그에 기록하지 않는다.
 */
export function resolveLlmEndpointKey(input: {
  endpoint: string;
  explicitApiKey?: string | null;
  envApiKey?: string | null;
}): LlmEndpointKeyDecision {
  const explicitApiKey = input.explicitApiKey?.trim() || null;
  const envApiKey = input.envApiKey?.trim() || null;

  if (isOpenRouterDefaultEndpoint(input.endpoint)) {
    return { allowed: true, apiKey: explicitApiKey ?? envApiKey };
  }

  if (explicitApiKey && envApiKey && explicitApiKey === envApiKey) {
    return { allowed: false, reason: 'default-key-not-allowed-for-custom-endpoint' };
  }

  return { allowed: true, apiKey: explicitApiKey };
}
