import { mockedMethods } from '@darun/utils-vitest-config/testing';
import { describe, expect, it, vi } from 'vitest';
import { Vote } from '../entities/Vote';
import type { VoteRepository } from '../repositories/VoteRepository';
import { GetVoteCount } from '../usecases/GetVoteCount';

function createMockRepository(): VoteRepository {
  return {
    upsertByTargetId: vi.fn(),
    findByTargetId: vi.fn(),
    findByTargetIds: vi.fn(),
    findTopNByVoteCount: vi.fn(),
  };
}

describe('GetVoteCount', () => {
  describe('execute', () => {
    it('투표 수를 반환한다', async () => {
      const repository = createMockRepository();
      const vote = new Vote({ id: 'vote-1', targetId: 'prod-1', count: 42 });
      mockedMethods(repository).findByTargetId.mockResolvedValue(vote);

      const usecase = new GetVoteCount(repository as never);
      const result = await usecase.execute({ productId: 'prod-1' });

      expect(mockedMethods(repository).findByTargetId).toHaveBeenCalledWith('prod-1');
      expect(result).toBe(42);
    });

    it('투표 기록이 없으면 0을 반환한다', async () => {
      const repository = createMockRepository();
      mockedMethods(repository).findByTargetId.mockResolvedValue(null);

      const usecase = new GetVoteCount(repository as never);
      const result = await usecase.execute({ productId: 'prod-1' });

      expect(result).toBe(0);
    });
  });
});
