import { GetAccount } from '@darun/accounts-domain';
import { Container } from 'typedi';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createGraphQLContext } from '../src/functions/context';

describe('GraphQL Context memoization', () => {
  let mockExecute: ReturnType<typeof vi.fn>;
  let mockGetAccount: GetAccount;

  beforeEach(() => {
    Container.reset();
    mockExecute = vi.fn();
    mockGetAccount = {
      execute: mockExecute,
    } as unknown as GetAccount;
  });

  afterEach(() => {
    Container.reset();
    vi.clearAllMocks();
  });

  it('should call GetAccount.execute only once when getUserId, getUserIdOrThrow, and getRoles are called sequentially', async () => {
    mockExecute.mockResolvedValue({
      id: 'user-123',
      email: 'test@test.com',
      roles: ['admin'],
    });

    const context = createGraphQLContext({
      requestId: 'test-request-id',
      authToken: 'valid-token',
      getAccountUseCase: mockGetAccount,
    });

    const userId = await context.getUserId();
    const userIdOrThrow = await context.getUserIdOrThrow();
    const roles = await context.getRoles();

    expect(userId).toBe('user-123');
    expect(userIdOrThrow).toBe('user-123');
    expect(roles).toEqual(['admin']);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith({ token: 'valid-token' });
  });

  it('should return undefined for getUserId when token is missing', async () => {
    mockExecute.mockResolvedValue(undefined);

    const context = createGraphQLContext({
      requestId: 'test-request-id',
      authToken: undefined,
      getAccountUseCase: mockGetAccount,
    });

    const userId = await context.getUserId();

    expect(userId).toBeUndefined();
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith({ token: undefined });
  });

  it('should throw error for getUserIdOrThrow when account is not found', async () => {
    mockExecute.mockResolvedValue(null);

    const context = createGraphQLContext({
      requestId: 'test-request-id',
      authToken: 'invalid-token',
      getAccountUseCase: mockGetAccount,
    });

    await expect(context.getUserIdOrThrow()).rejects.toThrow('Unauthorized');
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('should return empty array for getRoles when account is not found', async () => {
    mockExecute.mockResolvedValue(null);

    const context = createGraphQLContext({
      requestId: 'test-request-id',
      authToken: 'invalid-token',
      getAccountUseCase: mockGetAccount,
    });

    const roles = await context.getRoles();

    expect(roles).toEqual([]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('should return empty array for getRoles when account has no roles', async () => {
    mockExecute.mockResolvedValue({
      id: 'user-123',
      email: 'test@test.com',
      roles: [],
    });

    const context = createGraphQLContext({
      requestId: 'test-request-id',
      authToken: 'valid-token',
      getAccountUseCase: mockGetAccount,
    });

    const roles = await context.getRoles();

    expect(roles).toEqual([]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('should call GetAccount.execute only once even when only getUserId is called multiple times', async () => {
    mockExecute.mockResolvedValue({
      id: 'user-123',
      email: 'test@test.com',
      roles: ['admin'],
    });

    const context = createGraphQLContext({
      requestId: 'test-request-id',
      authToken: 'valid-token',
      getAccountUseCase: mockGetAccount,
    });

    await context.getUserId();
    await context.getUserId();
    await context.getUserId();

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
