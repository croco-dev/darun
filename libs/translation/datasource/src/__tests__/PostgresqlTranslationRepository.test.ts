import 'reflect-metadata';
import { Drizzle } from '@darun/provider-database';
import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { PostgresqlTranslationRepository } from '../repositories/PostgresqlTranslationRepository';

function makeTranslationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trans-1',
    entityType: 'product',
    entityId: 'prod-1',
    locale: 'en',
    field: 'name',
    value: 'Test Product',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PostgresqlTranslationRepository', () => {
  describe('findOne', () => {
    it('조건에 맞는 번역을 반환한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                then: vi
                  .fn()
                  .mockImplementation(async (fn: (rows: unknown[]) => unknown) => fn([makeTranslationRow()])),
              }),
            }),
          }),
        }),
      } as unknown as Drizzle;

      const repository = new PostgresqlTranslationRepository(mockDb);
      const result = await repository.findOne({
        entityType: 'product',
        entityId: 'prod-1',
        locale: 'en',
        field: 'name',
      });

      expect(result).not.toBeNull();
      expect(result!.entityId).toBe('prod-1');
      expect(result!.value).toBe('Test Product');
    });

    it('번역이 없으면 null을 반환한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                then: vi.fn().mockImplementation(async (fn: (rows: unknown[]) => unknown) => fn([])),
              }),
            }),
          }),
        }),
      } as unknown as Drizzle;

      const repository = new PostgresqlTranslationRepository(mockDb);
      const result = await repository.findOne({
        entityType: 'product',
        entityId: 'nonexistent',
        locale: 'en',
        field: 'name',
      });

      expect(result).toBeNull();
    });
  });

  describe('upsertMany', () => {
    function makeInsertChain() {
      const returning = vi.fn().mockResolvedValue([makeTranslationRow()]);
      const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
      const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
      const insert = vi.fn().mockReturnValue({ values });
      return { insert, values, onConflictDoUpdate, returning };
    }

    it('생략된 선택 필드가 기존 저장값을 지우지 않는다', async () => {
      const chain = makeInsertChain();
      const mockDb = { insert: chain.insert } as unknown as Drizzle;

      const repository = new PostgresqlTranslationRepository(mockDb);
      await repository.upsertMany([
        {
          entityType: 'product',
          entityId: 'prod-1',
          locale: 'en',
          field: 'name',
          value: 'New Name',
        },
      ]);

      expect(chain.onConflictDoUpdate).toHaveBeenCalledTimes(1);
      const setClause = (chain.onConflictDoUpdate.mock.calls[0] as Array<{ set: Record<string, unknown> }>)[0].set;
      for (const key of ['sourceHash', 'model', 'promptVersion'] as const) {
        const fragment = setClause[key] as { queryChunks?: unknown[] };
        expect(fragment?.queryChunks).toBeDefined();
        const chunkText = JSON.stringify(fragment.queryChunks, (_, value) =>
          typeof value === 'object' && value !== null && 'table' in (value as object)
            ? { name: (value as { name?: unknown }).name }
            : value
        );
        expect(chunkText).toMatch(/COALESCE/i);
      }
      expect(sql`test`).toBeDefined();
    });

    it('빈 목록이면 DB를 호출하지 않는다', async () => {
      const mockDb = { insert: vi.fn() } as unknown as Drizzle;

      const repository = new PostgresqlTranslationRepository(mockDb);
      const result = await repository.upsertMany([]);

      expect(result).toEqual([]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });
});
