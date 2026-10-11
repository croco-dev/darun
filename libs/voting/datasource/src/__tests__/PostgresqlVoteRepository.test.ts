import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { votes } from '../entities/VoteSchema';
import { PostgresqlVoteRepository } from '../repositories/PostgresqlVoteRepository';

describe('PostgresqlVoteRepository', () => {
  describe('findTopNByVoteCount', () => {
    it('orders by count desc with a deterministic tiebreak', async () => {
      const capturedOrderByArgs: unknown[] = [];
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockOrderBy = vi.fn().mockImplementation((...args: unknown[]) => {
        capturedOrderByArgs.push(args);
        return { limit: mockLimit };
      });
      const mockFrom = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockDb = { select: vi.fn().mockReturnValue({ from: mockFrom }) };

      const repository = new PostgresqlVoteRepository(
        mockDb as unknown as ConstructorParameters<typeof PostgresqlVoteRepository>[0]
      );
      await repository.findTopNByVoteCount(10);

      expect(mockOrderBy).toHaveBeenCalledTimes(1);
      const orderArgs = capturedOrderByArgs[0] as unknown[];
      expect(orderArgs.length).toBeGreaterThan(1);
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

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
      expect(votes).toBeDefined();
    });
  });
});
