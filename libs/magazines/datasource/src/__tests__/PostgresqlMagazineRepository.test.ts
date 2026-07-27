import 'reflect-metadata';
import { Magazine } from '@darun/magazines-domain';
import { Drizzle } from '@darun/provider-database';
import { describe, expect, it, vi } from 'vitest';
import { PostgresqlMagazineRepository } from '../repositories/PostgresqlMagazineRepository';

function makeSchema(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mag-1',
    title: '테스트 매거진',
    slug: 'test-magazine',
    summary: '요약',
    content: null,
    backgroundImageUrl: 'https://example.com/bg.png',
    logoImageUrl: null,
    authorId: 'author-1',
    publishedAt: null,
    updatedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('PostgresqlMagazineRepository', () => {
  describe('insert', () => {
    it('매거진을 삽입하고 반환한다', async () => {
      const returning = vi.fn().mockResolvedValue([makeSchema()]);
      const values = vi.fn().mockReturnValue({ returning });
      const mockTx = { insert: vi.fn().mockReturnValue({ values }) };
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
      } as unknown as Drizzle;

      const repository = new PostgresqlMagazineRepository(mockDb);
      const result = await repository.insert(
        new Magazine({ title: '테스트 매거진', backgroundImageUrl: 'https://example.com/bg.png', authorId: 'author-1' })
      );

      expect(result).toBeInstanceOf(Magazine);
      expect(result!.id).toBe('mag-1');
      expect(result!.title).toBe('테스트 매거진');
    });
  });

  describe('findOneById', () => {
    it('id로 매거진을 조회한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([makeSchema()]),
            }),
          }),
        }),
      } as unknown as Drizzle;

      const repository = new PostgresqlMagazineRepository(mockDb);
      const result = await repository.findOneById('mag-1');

      expect(result).toBeInstanceOf(Magazine);
      expect(result!.id).toBe('mag-1');
    });

    it('존재하지 않으면 null을 반환한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as unknown as Drizzle;

      const repository = new PostgresqlMagazineRepository(mockDb);
      const result = await repository.findOneById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
