import { describe, expect, it } from 'vitest';
import { parseErrorInfo } from '../AdminState';

describe('parseErrorInfo', () => {
  it('returns default fallback message when error is null or undefined', () => {
    expect(parseErrorInfo(null).summary).toBe('일시적인 오류가 발생했습니다. 다시 시도해 주세요.');
    expect(parseErrorInfo(undefined).summary).toBe('일시적인 오류가 발생했습니다. 다시 시도해 주세요.');
  });

  it('handles string errors directly', () => {
    const result = parseErrorInfo('문제가 발생했습니다');
    expect(result.summary).toBe('문제가 발생했습니다');
    expect(result.technicalDetails).toBe('문제가 발생했습니다');
  });

  it('handles standard Error instances', () => {
    const error = new Error('Database connection failed');
    const result = parseErrorInfo(error);
    expect(result.summary).toBe('Database connection failed');
    expect(result.technicalDetails).toContain('Database connection failed');
    expect(result.technicalDetails).toContain('name');
  });

  it('handles Apollo ServerError with HTTP 500 and result.message', () => {
    const serverError = {
      name: 'ServerError',
      message: 'Response not successful: Received status code 500',
      networkError: {
        name: 'ServerError',
        statusCode: 500,
        result: { message: 'Internal Server Error' },
      },
    };

    const result = parseErrorInfo(serverError);
    expect(result.statusCode).toBe(500);
    expect(result.summary).toBe('서버 오류 (HTTP 500): Internal Server Error');
    expect(result.technicalDetails).toContain('Internal Server Error');
    expect(result.technicalDetails).toContain('"statusCode": 500');
  });

  it('handles Apollo ServerError with result.errors', () => {
    const serverError = {
      name: 'ServerError',
      message: 'Response not successful: Received status code 500',
      networkError: {
        name: 'ServerError',
        statusCode: 500,
        result: {
          errors: [{ message: 'relation "llm_settings" does not exist' }],
        },
      },
    };

    const result = parseErrorInfo(serverError);
    expect(result.statusCode).toBe(500);
    expect(result.summary).toBe('relation "llm_settings" does not exist');
  });

  it('handles known HTTP status codes when no custom message is present', () => {
    expect(parseErrorInfo({ networkError: { statusCode: 401 } }).summary).toContain('인증 오류 (HTTP 401)');
    expect(parseErrorInfo({ networkError: { statusCode: 403 } }).summary).toContain('권한 오류 (HTTP 403)');
    expect(parseErrorInfo({ networkError: { statusCode: 404 } }).summary).toContain('요청 실패 (HTTP 404)');
    expect(parseErrorInfo({ networkError: { statusCode: 500 } }).summary).toContain('서버 내부 오류 (HTTP 500)');
  });

  it('extracts messages from GraphQL execution errors', () => {
    const apolloError = {
      graphQLErrors: [
        { message: 'Cannot query field "unknown" on type "Query"' },
        { message: 'Authentication token is expired' },
      ],
    };

    const result = parseErrorInfo(apolloError);
    expect(result.summary).toContain('Cannot query field "unknown" on type "Query"');
    expect(result.summary).toContain('Authentication token is expired');
  });

  it('handles TimeoutError with friendly Korean timeout message across string variations', () => {
    const timeoutError = {
      name: 'TimeoutError',
      message: "GraphQL operation 'GetLlmSetting' timed out after 15000ms",
    };

    const result = parseErrorInfo(timeoutError);
    expect(result.summary).toBe('요청 시간이 초과되었습니다. 네트워크 연결 또는 서버 상태를 확인해 주세요.');
    expect(result.technicalDetails).toContain('15000ms');

    const apolloTimeoutError = {
      name: 'ApolloError',
      message: 'Network error: TimeoutError',
      networkError: timeoutError,
    };

    const apolloResult = parseErrorInfo(apolloTimeoutError);
    expect(apolloResult.summary).toBe('요청 시간이 초과되었습니다. 네트워크 연결 또는 서버 상태를 확인해 주세요.');

    // Variations in message string
    expect(parseErrorInfo(new Error('Gateway timeout')).summary).toBe(
      '요청 시간이 초과되었습니다. 네트워크 연결 또는 서버 상태를 확인해 주세요.'
    );
    expect(parseErrorInfo(new Error('Request timed out')).summary).toBe(
      '요청 시간이 초과되었습니다. 네트워크 연결 또는 서버 상태를 확인해 주세요.'
    );
  });

  it('recursively checks nested networkError for timeout', () => {
    const deeplyNestedError = {
      name: 'ApolloError',
      networkError: {
        name: 'NestedNetworkError',
        networkError: {
          name: 'TimeoutError',
          message: 'Socket timeout',
        },
      },
    };

    const result = parseErrorInfo(deeplyNestedError);
    expect(result.summary).toBe('요청 시간이 초과되었습니다. 네트워크 연결 또는 서버 상태를 확인해 주세요.');
  });

  it('prioritizes GraphQL business errors over timeout heuristics when transport succeeded', () => {
    const businessTimeoutError = {
      graphQLErrors: [{ message: 'Session timeout: please re-authenticate' }],
    };

    const result = parseErrorInfo(businessTimeoutError);
    expect(result.summary).toBe('Session timeout: please re-authenticate');
  });

  it('handles AbortError with friendly cancellation message', () => {
    const abortError = {
      name: 'AbortError',
      message: 'The operation was aborted',
    };

    const result = parseErrorInfo(abortError);
    expect(result.summary).toBe('요청이 중단되었습니다.');

    // Message string includes 'aborted' without name: 'AbortError'
    expect(parseErrorInfo(new Error('Fetch request was aborted by client')).summary).toBe('요청이 중단되었습니다.');
  });

  it('handles both graphQLErrors and networkError present in ApolloError', () => {
    const mixedError = {
      name: 'ApolloError',
      graphQLErrors: [{ message: 'Validation failed' }],
      networkError: {
        statusCode: 500,
        result: { message: 'Internal server error' },
      },
    };

    const result = parseErrorInfo(mixedError);
    expect(result.summary).toBe('서버 오류 (HTTP 500): Internal server error');
    expect(result.technicalDetails).toContain('Validation failed');
    expect(result.technicalDetails).toContain('Internal server error');
  });
});
