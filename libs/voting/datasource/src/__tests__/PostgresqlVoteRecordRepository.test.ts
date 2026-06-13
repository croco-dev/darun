import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { voteRecords } from '../entities/VoteRecordSchema';
import { votes } from '../entities/VoteSchema';
import { PostgresqlVoteRecordRepository } from '../repositories/PostgresqlVoteRecordRepository';

describe('PostgresqlVoteRecordRepository', () => {
  describe('incrementVote', () => {
    it('uses atomic upsert with count increment, not select-then-update', async () => {
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'vote-1', targetId: 'target-1', count: 1 }]);
      const capturedOnConflictArgs: unknown[] = [];
      const mockOnConflictDoUpdate = vi.fn().mockImplementation((...args: unknown[]) => {
        capturedOnConflictArgs.push(args[0]);
        return { returning: mockReturning };
      });
      const mockValuesForVotes = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
      const mockValuesForVoteRecords = vi.fn().mockResolvedValue(undefined);

      const mockTx = {
        insert: vi.fn((table: unknown) => {
          if (table === votes) {
            return { values: mockValuesForVotes };
          }
          if (table === voteRecords) {
            return { values: mockValuesForVoteRecords };
          }
          return { values: vi.fn() };
        }),
      };

      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
      };

      const repository = new PostgresqlVoteRecordRepository(
        mockDb as unknown as ConstructorParameters<typeof PostgresqlVoteRecordRepository>[0]
      );
      const result = await repository.incrementVote('target-1', 'hash-123');

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.insert).toHaveBeenCalledWith(votes);
      expect(mockValuesForVotes).toHaveBeenCalledWith({
        targetId: 'target-1',
        count: 1,
      });
      expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
      expect(capturedOnConflictArgs[0]).toEqual(
        expect.objectContaining({
          target: votes.targetId,
          set: expect.objectContaining({ count: expect.anything() }),
        })
      );

      const conflictArg = capturedOnConflictArgs[0] as Record<string, { count: unknown }>;
      const setCount = conflictArg.set.count;
      expect(setCount).not.toBeNull();
      expect(typeof setCount).toBe('object');
      expect(setCount).toHaveProperty('queryChunks');

      // Verify the SQL expression references the column and increments by 1
      // sql`${votes.count} + 1` produces queryChunks: [StringChunk, ColumnRef, StringChunk(" + 1")]
      const chunks = (setCount as { queryChunks: unknown[] }).queryChunks;
      expect(chunks.length).toBeGreaterThanOrEqual(2);

      const hasColumnRef = chunks.some(
        (chunk: unknown) =>
          typeof chunk === 'object' &&
          chunk !== null &&
          !('value' in (chunk as Record<string, unknown>)) &&
          'table' in (chunk as Record<string, unknown>)
      );
      expect(hasColumnRef).toBe(true);

      const hasPlusOne = chunks.some((chunk: unknown) => {
        if (typeof chunk === 'object' && chunk !== null && 'value' in (chunk as Record<string, unknown>)) {
          const values = (chunk as { value: string[] }).value;
          return Array.isArray(values) && values.some(v => typeof v === 'string' && v.includes('+ 1'));
        }
        return false;
      });
      expect(hasPlusOne).toBe(true);

      expect(mockTx.insert).toHaveBeenCalledWith(voteRecords);
      expect(mockValuesForVoteRecords).toHaveBeenCalledWith({
        targetId: 'target-1',
        voterIpHash: 'hash-123',
      });
      expect(mockReturning).toHaveBeenCalledTimes(1);
      expect(result.targetId).toBe('target-1');
      expect(result.count).toBe(1);
    });

    it('inserts vote record in the same transaction callback as vote upsert', async () => {
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'vote-1', targetId: 'target-1', count: 1 }]);
      const mockValuesForVotes = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({ returning: mockReturning }),
      });
      const mockValuesForVoteRecords = vi.fn().mockResolvedValue(undefined);

      const mockTx = {
        insert: vi.fn((table: unknown) => {
          if (table === votes) {
            return { values: mockValuesForVotes };
          }
          if (table === voteRecords) {
            return { values: mockValuesForVoteRecords };
          }
          return { values: vi.fn() };
        }),
      };

      let capturedCallback: ((tx: typeof mockTx) => Promise<unknown>) | null = null;

      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
          capturedCallback = cb;
          return cb(mockTx);
        }),
      };

      const repository = new PostgresqlVoteRecordRepository(
        mockDb as unknown as ConstructorParameters<typeof PostgresqlVoteRecordRepository>[0]
      );
      await repository.incrementVote('target-1', 'hash-123');

      expect(capturedCallback).not.toBeNull();
      expect(mockTx.insert).toHaveBeenCalledWith(votes);
      expect(mockTx.insert).toHaveBeenCalledWith(voteRecords);
      expect(mockTx.insert).toHaveBeenCalledTimes(2);
    });
  });
});
