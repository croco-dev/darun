import { describe, expect, it, vi } from 'vitest';
import { Profile } from '../entities/Profile';
import type { ProfileRepository } from '../repositories/ProfileRepository';
import { GetProfile } from '../usecases/GetProfile';

function createMockProfileRepository(): ProfileRepository {
  return {
    findByUserId: vi.fn(),
    findManyByUserIds: vi.fn(),
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
  it('일괄 조회는 사용자 순서·중복·없는 프로필을 유지하고 단건 조회로 나누지 않는다', async () => {
    const repository = createMockProfileRepository();
    const first = new Profile({ id: 'profile-a', displayName: '작성자 A' });
    const second = new Profile({ id: 'profile-b', displayName: '작성자 B' });
    const ids = ['user-b', 'missing', 'user-a', 'user-b'];
    vi.mocked(repository.findManyByUserIds).mockResolvedValue([second, null, first, second]);

    expect(await new GetProfile(repository).executeMany(ids)).toEqual([second, null, first, second]);
    expect(repository.findManyByUserIds).toHaveBeenCalledExactlyOnceWith(ids);
    expect(repository.findByUserId).not.toHaveBeenCalled();
  });
});
