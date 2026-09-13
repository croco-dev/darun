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
});
