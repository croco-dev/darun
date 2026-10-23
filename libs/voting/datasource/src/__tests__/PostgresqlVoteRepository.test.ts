import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { PostgresqlVoteRepository } from '../repositories/PostgresqlVoteRepository';

describe('PostgresqlVoteRepository', () => {
  it('batches 30 count lookups and preserves missing targets without retaining stale counts', async () => {
    let count = 7;
    const select = vi.fn(() => ({
      from: () => ({
        where: async () => [{ id: 'vote', targetId: 'p17', count }],
      }),
    }));
    const repository = new PostgresqlVoteRepository({ select } as unknown as ConstructorParameters<
      typeof PostgresqlVoteRepository
    >[0]);
    const results = await Promise.all(Array.from({ length: 30 }, (_, index) => repository.findByTargetId(`p${index}`)));
    expect(select).toHaveBeenCalledTimes(1);
    expect(results[17]?.count).toBe(7);
    expect(results.filter(Boolean)).toHaveLength(1);
    count = 8;
    expect((await repository.findByTargetId('p17'))?.count).toBe(8);
  });
  describe('findTopNByVoteCount', () => {
    it('returns votes mapped from rows', async () => {
      const rows = [
        { id: 'vote-2', targetId: 'target-2', count: 5 },
        { id: 'vote-1', targetId: 'target-1', count: 5 },
      ];
      const mockLimit = vi.fn().mockResolvedValue(rows);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockDb = { select: vi.fn().mockReturnValue({ from: mockFrom }) };

      const repository = new PostgresqlVoteRepository(
        mockDb as unknown as ConstructorParameters<typeof PostgresqlVoteRepository>[0]
      );
      const result = await repository.findTopNByVoteCount(2);

      expect(result).toHaveLength(2);
      expect(result[0]?.targetId).toBe('target-2');
      expect(result[1]?.targetId).toBe('target-1');
    });
  });
});
