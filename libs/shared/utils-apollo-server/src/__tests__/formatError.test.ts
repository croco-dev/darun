import { createDomainError } from '@darun/utils-error';
import { GraphQLError, graphql, buildSchema } from 'graphql';
import { AuthenticationError, AuthorizationError } from 'type-graphql';
import { describe, expect, it, vi } from 'vitest';
import { formatServerError } from '../libs/createServer/formatError';

describe('production GraphQL error responses', () => {
  it('masks a real resolver failure and keeps server diagnostics', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const error = Object.assign(new Error('injected database password=secret'), { code: 'XX000' });
      const result = await graphql({
        schema: buildSchema('type Query { broken: String }'),
        source: '{ broken }',
        rootValue: {
          broken: () => {
            throw error;
          },
        },
      });
      const original = result.errors![0];
      const response = formatServerError(original.toJSON(), original, false);
      expect(response.message).toBe('Internal server error');
      expect(response.extensions).toEqual({ code: 'INTERNAL_SERVER_ERROR' });
      expect(JSON.stringify(response)).not.toContain('secret');
      expect(diagnostic).toHaveBeenCalledWith('[GraphQL Error]', expect.objectContaining({ path: ['broken'] }));
      expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('secret');
      expect(formatServerError(original.toJSON(), original, true).message).toContain('secret');
    } finally {
      diagnostic.mockRestore();
    }
  });
  it.each([
    [createDomainError('voting/duplicate-vote', 'Already voted'), 'voting/duplicate-vote'],
    [new AuthenticationError(), 'UNAUTHENTICATED'],
    [new AuthorizationError(), 'UNAUTHORIZED'],
  ])('preserves safe domain and authorization errors', (error, code) => {
    const wrapped = new GraphQLError(error.message, { originalError: error, extensions: { stacktrace: ['secret'] } });
    const response = formatServerError(wrapped.toJSON(), wrapped, false);
    expect(response.message).toBe(error.message);
    expect(response.extensions).toEqual({ code });
  });
  it('preserves an explicit public GraphQL error while stripping arbitrary extensions', () => {
    const error = new GraphQLError('Please retry', { extensions: { code: 'RETRY_LATER', private: 'secret' } });
    const wrapped = new GraphQLError(error.message, { originalError: error });
    expect(formatServerError(wrapped.toJSON(), wrapped, false)).toMatchObject({
      message: 'Please retry',
      extensions: { code: 'RETRY_LATER' },
    });
    expect(JSON.stringify(formatServerError(wrapped.toJSON(), wrapped, false))).not.toContain('secret');
  });
  it('preserves GraphQL validation errors without arbitrary extensions', () => {
    const error = new GraphQLError('Unknown field', {
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED', secret: 'secret' },
    });
    expect(formatServerError(error.toJSON(), error, false)).toMatchObject({
      message: 'Unknown field',
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
    });
    expect(JSON.stringify(formatServerError(error.toJSON(), error, false))).not.toContain('secret');
  });
});
