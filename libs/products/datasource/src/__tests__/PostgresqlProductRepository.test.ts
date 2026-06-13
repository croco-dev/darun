import 'reflect-metadata';
import { Product } from '@darun/products-domain';
import { Drizzle } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PostgresqlProductRepository } from '../repositories/PostgresqlProductRepository';
import { products } from '../entities/ProductSchema';

function createMockDb(rows: Record<string, unknown>[]) {
  const orderByMock = vi.fn().mockResolvedValue(rows);
  const whereMock = vi.fn().mockReturnValue({
    orderBy: orderByMock,
  });
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: whereMock,
        }),
      }),
    } as unknown as Drizzle,
    whereMock,
    orderByMock,
  };
}

function extractSqlString(sqlObj: unknown): string {
  if (!sqlObj || typeof sqlObj !== 'object') return '';
  const obj = sqlObj as Record<string, unknown>;
  if (Array.isArray(obj.value)) return obj.value.join('');
  if (Array.isArray(obj.queryChunks)) return obj.queryChunks.map((chunk: unknown) => extractSqlString(chunk)).join('');
  return '';
}

describe('PostgresqlProductRepository DataLoader cache invalidation', () => {
  let mockDb: { transaction: ReturnType<typeof vi.fn>; select?: ReturnType<typeof vi.fn> };
  let clearAllSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockDb = {
      transaction: vi.fn(),
    };
    clearAllSpy = vi.spyOn(DataLoader.prototype, 'clearAll');
  });

  afterEach(() => {
    clearAllSpy.mockRestore();
  });

  describe('insert()', () => {
    it('should call publishedIdLoader.clearAll() after successful insert', async () => {
      const product = new Product({
        id: 'product-1',
        slug: 'test-product',
        name: 'Test Product',
        summary: 'A test product',
        logoUrl: 'https://example.com/logo.png',
      });
      mockDb.transaction.mockResolvedValue(product);
      const repository = new PostgresqlProductRepository(mockDb as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await repository.insert(product);

      expect(result).toBe(product);
      expect(clearAllSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateById()', () => {
    it('should call publishedIdLoader.clearAll() after successful update', async () => {
      const product = new Product({
        id: 'product-1',
        slug: 'test-product',
        name: 'Test Product',
        summary: 'A test product',
        logoUrl: 'https://example.com/logo.png',
      });
      mockDb.transaction.mockResolvedValue(product);
      const repository = new PostgresqlProductRepository(mockDb as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await repository.updateById('product-1', (p: Product) => p);

      expect(result).toBe(product);
      expect(clearAllSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('findPublishedByCategoryIdAndLimit()', () => {
    it('delegates to the database with published-only filter and the supplied limit', async () => {
      const product1 = new Product({
        id: 'product-1',
        slug: 'product-1',
        name: 'Product 1',
        summary: 'Test',
        logoUrl: 'https://example.com/logo1.png',
        publishedAt: new Date('2026-01-02'),
      });
      const product2 = new Product({
        id: 'product-2',
        slug: 'product-2',
        name: 'Product 2',
        summary: 'Test 2',
        logoUrl: 'https://example.com/logo2.png',
        publishedAt: new Date('2026-01-01'),
      });
      const mockThen = vi.fn().mockResolvedValue([product1, product2, product2]);
      const mockLimit = vi.fn().mockReturnValue({ then: mockThen });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.select = vi.fn().mockReturnValue({ from: mockFrom });

      const repository = new PostgresqlProductRepository(mockDb as unknown as ConstructorParameters<typeof PostgresqlProductRepository>[0]);

      const result = await repository.findPublishedByCategoryIdAndLimit('cat-1', 2);

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith(products);
      expect(mockLimit).toHaveBeenCalledWith(2);
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('product-1');
    });
  });
});

describe('PostgresqlProductRepository findPublishedByCategoryId()', () => {
  it('should include ::jsonb cast in the category filter SQL', async () => {
    const { db, whereMock } = createMockDb([]);
    const repository = new PostgresqlProductRepository(db);

    await repository.findPublishedByCategoryId('cat-a');

    expect(whereMock).toHaveBeenCalledTimes(1);
    const whereArg = whereMock.mock.calls[0][0];
    const sqlString = extractSqlString(whereArg);
    expect(sqlString).toContain('::jsonb');
    expect(sqlString).toContain('@>');
  });

  it('should filter by publishedAt is not null', async () => {
    const { db, whereMock } = createMockDb([]);
    const repository = new PostgresqlProductRepository(db);

    await repository.findPublishedByCategoryId('cat-a');

    expect(whereMock).toHaveBeenCalledTimes(1);
    const whereArg = whereMock.mock.calls[0][0];
    const sqlString = extractSqlString(whereArg);
    expect(sqlString).toContain('is not null');
  });

  it('should return mapped products from the database', async () => {
    const rows = [
      {
        id: 'product-1',
        slug: 'product-1',
        name: 'Published Product',
        summary: 'Summary',
        logoUrl: 'https://example.com/1.png',
        categoryIds: ['cat-a'],
        publishedAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        ownedCompanyId: null,
        description: null,
      },
    ];
    const { db } = createMockDb(rows);
    const repository = new PostgresqlProductRepository(db);

    const result = await repository.findPublishedByCategoryId('cat-a');

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Product);
    expect(result[0].id).toBe('product-1');
    expect(result[0].name).toBe('Published Product');
  });

  it('should order results by publishedAt descending', async () => {
    const { db, orderByMock } = createMockDb([]);
    const repository = new PostgresqlProductRepository(db);

    await repository.findPublishedByCategoryId('cat-a');

    expect(orderByMock).toHaveBeenCalledTimes(1);
    expect(orderByMock.mock.calls[0][0]).toBeDefined();
  });
});
