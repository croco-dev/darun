import { AuthService, AuthStorage } from '@darun/utils-auth-service-core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authChecker } from './AuthChecker';

function createMockAuthService(user: { id: string; isAdmin: boolean } | null): AuthService {
  return {
    getUser: vi.fn().mockResolvedValue(user),
    setAuthStorage: vi.fn(),
  } as unknown as AuthService;
}

function createMockCookies(token: string): { get: (key: string) => string | undefined; set: (...args: Array<unknown>) => void; remove: (...args: Array<unknown>) => void } {
  return {
    get: vi.fn((key: string) => (key === 'token' ? token : undefined)),
    set: vi.fn(),
    remove: vi.fn(),
  };
}

describe('AuthChecker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should use direct authService when passed directly', async () => {
    const mockService = createMockAuthService({ id: 'user1', isAdmin: true });
    const cookies = createMockCookies('token-abc');

    authChecker.init(mockService);
    const result = await authChecker.getUser(cookies);

    expect(result).toEqual({ id: 'user1', isAdmin: true });
    expect(mockService.setAuthStorage).toHaveBeenCalled();
  });

  it('should create fresh authService instance for each call when factory is used', async () => {
    const mockService1 = createMockAuthService({ id: 'user1', isAdmin: true });
    const mockService2 = createMockAuthService({ id: 'user2', isAdmin: false });
    const factory = vi.fn().mockReturnValueOnce(mockService1).mockReturnValueOnce(mockService2);

    const cookies1 = createMockCookies('token-abc');
    const cookies2 = createMockCookies('token-xyz');

    authChecker.init(factory);

    const [result1, result2] = await Promise.all([authChecker.getUser(cookies1), authChecker.getUser(cookies2)]);

    expect(factory).toHaveBeenCalledTimes(2);
    expect(result1).toEqual({ id: 'user1', isAdmin: true });
    expect(result2).toEqual({ id: 'user2', isAdmin: false });
    expect(mockService1.setAuthStorage).toHaveBeenCalled();
    expect(mockService2.setAuthStorage).toHaveBeenCalled();
  });

  it('should not cross-contaminate cookies between concurrent requests', async () => {
    const setAuthStorageCalls: Array<{ get: (key: string) => string | null }> = [];

    const createTrackingService = (user: { id: string }) =>
      ({
        getUser: vi.fn().mockResolvedValue(user),
        setAuthStorage: vi.fn((storage: AuthStorage) => {
          setAuthStorageCalls.push(storage);
        }),
      }) as unknown as AuthService;

    const service1 = createTrackingService({ id: 'user1' });
    const service2 = createTrackingService({ id: 'user2' });
    const factory = vi.fn().mockReturnValueOnce(service1).mockReturnValueOnce(service2);

    const cookies1 = createMockCookies('token-for-user1');
    const cookies2 = createMockCookies('token-for-user2');

    authChecker.init(factory);

    await Promise.all([authChecker.getUser(cookies1), authChecker.getUser(cookies2)]);

    expect(setAuthStorageCalls).toHaveLength(2);
    expect(setAuthStorageCalls[0]!.get('token')).toBe('token-for-user1');
    expect(setAuthStorageCalls[1]!.get('token')).toBe('token-for-user2');
  });
});
