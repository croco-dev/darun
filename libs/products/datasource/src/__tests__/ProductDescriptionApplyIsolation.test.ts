import { describe, expect, it, vi } from 'vitest';
import { PostgresqlProductDescriptionApplyStore } from '../repositories/PostgresqlProductDescriptionApplyStore';

describe('description apply transaction isolation', () => {
  it('starts B on a separate transaction while A is open; A rollback cannot undo B commit', async () => {
    let signalStarted!: () => void;
    let releaseTransaction!: () => void;
    const started = new Promise<void>(resolve => {
      signalStarted = resolve;
    });
    const release = new Promise<void>(resolve => {
      releaseTransaction = resolve;
    });
    const committed: number[] = [];
    const rolledBack: number[] = [];
    let next = 0;
    const db = {
      transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => {
        const id = ++next;
        const tx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: () => ({
                  limit: async () => [{ id: String(id), name: 'product', slug: String(id), summary: '', logoUrl: '' }],
                }),
              }),
            }),
          }),
        };
        try {
          const result = await work(tx);
          committed.push(id);
          return result;
        } catch (error) {
          rolledBack.push(id);
          throw error;
        }
      }),
    };
    const store = new PostgresqlProductDescriptionApplyStore(db as never);
    const a = store.transaction.run(async tx => {
      expect((await tx.findLockedProduct('a'))?.id).toBe('1');
      signalStarted();
      await release;
      expect((await tx.findLockedProduct('a'))?.id).toBe('1');
      throw new Error('rollback A');
    });
    const rejectedA = expect(a).rejects.toThrow('rollback A');
    await started;
    await store.transaction.run(async tx => {
      expect((await tx.findLockedProduct('b'))?.id).toBe('2');
    });
    expect(committed).toEqual([2]);
    releaseTransaction();
    await rejectedA;
    expect(rolledBack).toEqual([1]);
    expect(committed).toEqual([2]);
    expect(db.transaction).toHaveBeenCalledTimes(2);
  });

  it('restarts serialization failures with a fresh adapter and bounds retries', async () => {
    const adapters = new Set<unknown>();
    const db = {
      transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => {
        await work({});
        throw Object.assign(new Error('serialization conflict'), { code: '40001' });
      }),
    };
    const store = new PostgresqlProductDescriptionApplyStore(db as never);
    await expect(
      store.transaction.run(async tx => {
        adapters.add(tx);
      })
    ).rejects.toThrow('serialization conflict');
    expect(db.transaction).toHaveBeenCalledTimes(3);
    expect(adapters.size).toBe(3);
    expect(db.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'serializable' });
  });
});
