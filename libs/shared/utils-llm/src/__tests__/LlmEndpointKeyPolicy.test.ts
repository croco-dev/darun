import { describe, expect, it } from 'vitest';
import {
  LlmConfigReadFailedError,
  isOpenRouterDefaultEndpoint,
  normalizeLlmEndpointBase,
  resolveLlmEndpointKey,
} from '../libs/LlmEndpointKeyPolicy';

describe('normalizeLlmEndpointBase', () => {
  it.each([
    ['https://openrouter.ai/api/v1', 'https://openrouter.ai/api/v1'],
    ['https://openrouter.ai/api/v1/', 'https://openrouter.ai/api/v1'],
    ['https://openrouter.ai/api/v1///', 'https://openrouter.ai/api/v1'],
    ['https://openrouter.ai/api/v1/models', 'https://openrouter.ai/api/v1'],
    ['https://openrouter.ai/api/v1/models/', 'https://openrouter.ai/api/v1'],
    ['  https://openrouter.ai/api/v1  ', 'https://openrouter.ai/api/v1'],
    ['https://custom.example.com/', 'https://custom.example.com'],
  ])('정규화: %s -> %s', (input, expected) => {
    expect(normalizeLlmEndpointBase(input)).toBe(expected);
  });
});

describe('isOpenRouterDefaultEndpoint', () => {
  it.each(['https://openrouter.ai/api/v1', 'https://openrouter.ai/api/v1/', 'https://openrouter.ai/api/v1/models'])(
    '기본 base로 인식: %s',
    endpoint => {
      expect(isOpenRouterDefaultEndpoint(endpoint)).toBe(true);
    }
  );

  it.each([
    'https://openrouter.ai/api/v2',
    'https://api.openrouter.ai/api/v1',
    'https://custom.example.com/v1',
    'https://evil.example.com/openrouter.ai/api/v1',
  ])('기본 base가 아님: %s', endpoint => {
    expect(isOpenRouterDefaultEndpoint(endpoint)).toBe(false);
  });
});

describe('resolveLlmEndpointKey', () => {
  it('기본 OpenRouter base는 환경 기본 키를 fallback으로 사용한다', () => {
    const decision = resolveLlmEndpointKey({
      endpoint: 'https://openrouter.ai/api/v1',
      explicitApiKey: null,
      envApiKey: 'sk-env',
    });
    expect(decision).toEqual({ allowed: true, apiKey: 'sk-env' });
  });

  it('기본 base의 명시 키는 환경 키보다 우선한다', () => {
    const decision = resolveLlmEndpointKey({
      endpoint: 'https://openrouter.ai/api/v1/models',
      explicitApiKey: 'sk-explicit',
      envApiKey: 'sk-env',
    });
    expect(decision).toEqual({ allowed: true, apiKey: 'sk-explicit' });
  });

  it('커스텀 엔드포인트는 환경 기본 키를 fallback으로 사용하지 않는다(공개 조회 null)', () => {
    const decision = resolveLlmEndpointKey({
      endpoint: 'https://custom.example.com/v1',
      explicitApiKey: null,
      envApiKey: 'sk-env',
    });
    expect(decision).toEqual({ allowed: true, apiKey: null });
  });

  it('커스텀 엔드포인트의 별도 공급자 키는 허용한다', () => {
    const decision = resolveLlmEndpointKey({
      endpoint: 'https://custom.example.com/v1',
      explicitApiKey: 'sk-custom',
      envApiKey: 'sk-env',
    });
    expect(decision).toEqual({ allowed: true, apiKey: 'sk-custom' });
  });

  it('커스텀 엔드포인트에 환경 기본 키와 같은 키를 명시하면 거절한다', () => {
    const decision = resolveLlmEndpointKey({
      endpoint: 'https://custom.example.com/v1',
      explicitApiKey: 'sk-env',
      envApiKey: 'sk-env',
    });
    expect(decision).toEqual({ allowed: false, reason: 'default-key-not-allowed-for-custom-endpoint' });
  });

  it('환경 키가 없으면 커스텀 엔드포인트의 임의 키를 허용한다', () => {
    const decision = resolveLlmEndpointKey({
      endpoint: 'https://custom.example.com/v1',
      explicitApiKey: 'sk-anything',
      envApiKey: null,
    });
    expect(decision).toEqual({ allowed: true, apiKey: 'sk-anything' });
  });

  it('빈 문자열 키는 null로 정규화한다', () => {
    const decision = resolveLlmEndpointKey({
      endpoint: 'https://openrouter.ai/api/v1',
      explicitApiKey: '   ',
      envApiKey: 'sk-env',
    });
    expect(decision).toEqual({ allowed: true, apiKey: 'sk-env' });
  });
});

describe('LlmConfigReadFailedError', () => {
  it('retryable이고 code를 노출한다', () => {
    const error = new LlmConfigReadFailedError();

    expect(error.name).toBe('LlmConfigReadFailedError');
    expect(error.code).toBe('LLM_CONFIG_READ_FAILED');
    expect(error.cause).toBeUndefined();
    expect(error.statusCode).toBeUndefined();
  });
});
