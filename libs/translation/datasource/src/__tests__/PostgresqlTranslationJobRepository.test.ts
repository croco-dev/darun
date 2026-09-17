import 'reflect-metadata';
import { Drizzle } from '@darun/provider-database';
import { describe, expect, it, vi } from 'vitest';
import { PostgresqlTranslationJobRepository } from '../repositories/PostgresqlTranslationJobRepository';

function makeJobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    entityType: 'Product',
    entityId: 'prod-1',
    locale: 'en',
    status: 'pending',
    message: '대기 중',
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PostgresqlTranslationJobRepository', () => {
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
