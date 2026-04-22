import { describe, expect, it, vi } from 'vitest';

import { createGraphQLContext } from '../src/functions/context';

describe('graphql-api setup', () => {
  it('GraphQL 컨텍스트가 요청 메타데이터와 헬퍼를 노출한다', async () => {
    const getAccountUseCase = {
      execute: vi.fn().mockResolvedValue({
        id: 'usr_123',
        email: 'test@darun.io',
        roles: ['admin'],
      }),
    };

    const context = createGraphQLContext({
      requestId: 'req_123',
      authToken: 'token_123',
      clientIp: '127.0.0.1',
      getAccountUseCase,
    });

    expect(context.requestId).toBe('req_123');
    expect(context.authToken).toBe('token_123');
    expect(context.clientIp).toBe('127.0.0.1');
    expect(await context.getUserId()).toBe('usr_123');
    expect(await context.getRoles()).toEqual(['admin']);
  });
});
