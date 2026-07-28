import 'reflect-metadata';
import { Drizzle } from '@darun/provider-database';
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
});
