import 'reflect-metadata';
import { Product } from '@darun/products-domain';
import DataLoader from 'dataloader';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PostgresqlProductRepository } from '../repositories/PostgresqlProductRepository';

describe('PostgresqlProductRepository DataLoader cache invalidation', () => {
  let mockDb: { transaction: ReturnType<typeof vi.fn> };
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
});
