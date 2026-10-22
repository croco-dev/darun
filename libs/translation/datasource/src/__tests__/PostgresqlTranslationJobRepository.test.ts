import 'reflect-metadata';
import { Drizzle } from '@darun/provider-database';
import { describe, expect, it, vi } from 'vitest';
import { PostgresqlTranslationJobRepository } from '../repositories/PostgresqlTranslationJobRepository';
import { PostgresqlTranslationRepository } from '../repositories/PostgresqlTranslationRepository';

function makeJobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    entityType: 'Product',
    entityId: 'prod-1',
    locale: 'en',
    status: 'pending',
    message: '대기 중',
    leaseToken: 'A',
    leaseUntil: new Date(Date.now() + 60_000),
    attemptCount: 1,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PostgresqlTranslationJobRepository', () => {
  it('rejects an attempt that no longer owns a live lease without writing rows', async () => {
    const write = vi.spyOn(PostgresqlTranslationRepository.prototype, 'upsertMany');
    const tx = {
      select: () => ({ from: () => ({ where: () => ({ for: async () => [] }) }) }),
    };
    const db = { transaction: async (run: (context: unknown) => Promise<boolean>) => run(tx) };
    const repository = new PostgresqlTranslationJobRepository(db as unknown as Drizzle);
    try {
      expect(
        await repository.commitTranslations('job-1', 'old-A', [
          {
            entityType: 'Product',
            entityId: 'prod-1',
            locale: 'en',
            field: 'name',
            value: 'late',
          },
        ])
      ).toBe(false);
      expect(write).not.toHaveBeenCalled();
    } finally {
      write.mockRestore();
    }
  });

  it('rejects a lease that expired while waiting for the row lock', async () => {
    let release!: () => void;
    const locked = new Promise<void>(resolve => {
      release = resolve;
    });
    const expiresAt = new Date(Date.now() + 60_000);
    const tx = {
      select: () => ({
        from: () => ({
          where: () => ({
            for: async () => {
              await locked;
              return [makeJobRow({ leaseUntil: expiresAt })];
            },
          }),
        }),
      }),
    };
    const db = { transaction: async (run: (context: unknown) => Promise<boolean>) => run(tx) };
    const repository = new PostgresqlTranslationJobRepository(db as unknown as Drizzle);
    const pending = repository.commitTranslations('job-1', 'A', []);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(expiresAt.getTime() + 1);
    try {
      release();
      expect(await pending).toBe(false);
    } finally {
      clock.mockRestore();
    }
  });

  it('persists rows for an owned lease inside the transaction', async () => {
    const rows = [
      {
        entityType: 'Product',
        entityId: 'prod-1',
        locale: 'en',
        field: 'name',
        value: 'current',
      },
    ];
    const persisted: unknown[] = [];
    const tx = {
      select: () => ({ from: () => ({ where: () => ({ for: async () => [makeJobRow()] }) }) }),
      insert: () => ({
        values: (values: unknown[]) => ({
          onConflictDoUpdate: () => ({
            returning: async () => {
              persisted.push(...values);
              return values;
            },
          }),
        }),
      }),
    };
    const db = { transaction: async (run: (context: unknown) => Promise<boolean>) => run(tx) };
    const repository = new PostgresqlTranslationJobRepository(db as unknown as Drizzle);
    expect(await repository.commitTranslations('job-1', 'A', rows)).toBe(true);
    expect(persisted).toEqual([expect.objectContaining({ value: 'current' })]);
  });
  describe('findJobs', () => {
    it('목록을 정상적으로 조회한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockReturnValue({
                  then: vi.fn().mockImplementation(async (fn: (rows: unknown[]) => unknown) => fn([makeJobRow()])),
                }),
              }),
            }),
          }),
        }),
      } as unknown as Drizzle;

      const repository = new PostgresqlTranslationJobRepository(mockDb);
      const results = await repository.findJobs({ limit: 10, offset: 0 });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('job-1');
      expect(results[0]?.status).toBe('pending');
    });

    it('status 필터가 제공되면 where 조건으로 필터링한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockReturnValue({
                    then: vi
                      .fn()
                      .mockImplementation(async (fn: (rows: unknown[]) => unknown) =>
                        fn([makeJobRow({ status: 'failed' })])
                      ),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as unknown as Drizzle;

      const repository = new PostgresqlTranslationJobRepository(mockDb);
      const results = await repository.findJobs({ status: 'failed', limit: 5 });

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('failed');
    });
  });

  describe('findJobById', () => {
    it('ID로 단일 작업을 조회한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                then: vi.fn().mockImplementation(async (fn: (rows: unknown[]) => unknown) => fn([makeJobRow()])),
              }),
            }),
          }),
        }),
      } as unknown as Drizzle;

      const repository = new PostgresqlTranslationJobRepository(mockDb);
      const result = await repository.findJobById('job-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('job-1');
    });
  });
});
