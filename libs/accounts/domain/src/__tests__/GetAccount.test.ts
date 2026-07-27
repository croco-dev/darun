import { describe, expect, it, vi } from 'vitest';
import type { AccountRepository } from '../repositories/AccountRepository';
import { GetAccount } from '../usecases/GetAccount';

function createMockAccountRepository(): AccountRepository {
  return {
    parseByToken: vi.fn(),
  };
}

describe('GetAccount', () => {
  describe('execute', () => {
    it('token이 없으면 undefined를 반환한다', async () => {
      const repository = createMockAccountRepository();
      const usecase = new GetAccount(repository as never);

      const result = await usecase.execute({});

      expect(result).toBeUndefined();
      expect(repository.parseByToken).not.toHaveBeenCalled();
    });

    it('token이 있으면 repository에서 계정을 조회한다', async () => {
      const repository = createMockAccountRepository();
      const mockAccount = { id: 'user-1', email: 'test@example.com', roles: ['user'] };
      vi.mocked(repository.parseByToken).mockResolvedValue(mockAccount);

      const usecase = new GetAccount(repository as never);
      const result = await usecase.execute({ token: 'bearer-token-123' });

      expect(repository.parseByToken).toHaveBeenCalledWith('bearer-token-123');
      expect(result).toEqual(mockAccount);
    });

    it('repository가 null을 반환하면 null을 그대로 반환한다', async () => {
      const repository = createMockAccountRepository();
      vi.mocked(repository.parseByToken).mockResolvedValue(null);

      const usecase = new GetAccount(repository as never);
      const result = await usecase.execute({ token: 'invalid-token' });

      expect(result).toBeNull();
    });
  });
});
