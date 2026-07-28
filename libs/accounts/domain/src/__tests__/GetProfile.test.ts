import { describe, expect, it, vi } from 'vitest';
import { Profile } from '../entities/Profile';
import type { ProfileRepository } from '../repositories/ProfileRepository';
import { GetProfile } from '../usecases/GetProfile';

function createMockProfileRepository(): ProfileRepository {
  return {
    findByUserId: vi.fn(),
  };
}

describe('GetProfile', () => {
  describe('execute', () => {
    it('userId로 프로필을 조회한다', async () => {
      const repository = createMockProfileRepository();
      const mockProfile = new Profile({ id: 'user-1', displayName: '홍길동' });
      vi.mocked(repository.findByUserId).mockResolvedValue(mockProfile);

      const usecase = new GetProfile(repository as never);
      const result = await usecase.execute({ userId: 'user-1' });

      expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toBe(mockProfile);
    });

    it('프로필이 없으면 null을 반환한다', async () => {
      const repository = createMockProfileRepository();
      vi.mocked(repository.findByUserId).mockResolvedValue(null);

      const usecase = new GetProfile(repository as never);
      const result = await usecase.execute({ userId: 'nonexistent' });

      expect(result).toBeNull();
    });
  });
});
