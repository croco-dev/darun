import { describe, it, expect, vi } from 'vitest';

import { createGraphQLContext } from '../src/functions/context';

describe('GraphQL context compatibility baseline', () => {
  it('노출하는 필드와 헬퍼가 기존 스키마를 유지한다', () => {
    const getAccountUseCase = {
      execute: vi.fn().mockResolvedValue({
        id: 'usr_baseline',
        email: 'baseline@darun.io',
        roles: ['viewer'],
      }),
    };

    const context = createGraphQLContext({
      requestId: 'req_baseline',
      authToken: 'token_baseline',
      clientIp: '192.0.2.1',
      getAccountUseCase,
    });

    expect(context).toMatchObject({
      requestId: 'req_baseline',
      authToken: 'token_baseline',
      clientIp: '192.0.2.1',
    });
    expect(typeof context.getUserId).toBe('function');
    expect(typeof context.getUserIdOrThrow).toBe('function');
    expect(typeof context.getRoles).toBe('function');
  });

  it('clientIp가 없는 요청에서도 context가 생성된다', () => {
    const getAccountUseCase = {
      execute: vi.fn().mockResolvedValue(undefined),
    };

    const context = createGraphQLContext({
      requestId: 'req_no_ip',
      authToken: undefined,
      getAccountUseCase,
    });

    expect(context.clientIp).toBeUndefined();
    expect(context.requestId).toBe('req_no_ip');
  });

  it('getAccountUseCase 호출 시 토큰을 그대로 전달한다', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const context = createGraphQLContext({
      requestId: 'req_token_passthrough',
      authToken: 'bearer-token-123',
      clientIp: '127.0.0.1',
      getAccountUseCase: { execute },
    });

    await context.getUserId();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ token: 'bearer-token-123' });
  });

  it('계정 조회 결과가 null일 때 getRoles는 빈 배열을 반환한다', async () => {
    const execute = vi.fn().mockResolvedValue(null);
    const context = createGraphQLContext({
      requestId: 'req_null_account',
      authToken: 'token',
      getAccountUseCase: { execute },
    });

    const roles = await context.getRoles();

    expect(roles).toEqual([]);
  });
});
