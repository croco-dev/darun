import 'reflect-metadata';
import { ProductFeature } from '@darun/products-domain';
import { Drizzle } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { productFeatures } from '../entities/ProductFeaturesSchema';
import { PostgresqlProductFeatureRepository } from '../repositories/PostgresqlProductFeatureRepository';

describe('PostgresqlProductFeatureRepository DataLoader cache invalidation', () => {
  let mockDb: Drizzle & {
    transaction: ReturnType<typeof vi.fn>;
    select?: ReturnType<typeof vi.fn>;
    insert?: ReturnType<typeof vi.fn>;
    update?: ReturnType<typeof vi.fn>;
  };
  let clearAllSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockDb = {
      transaction: vi.fn(),
    } as unknown as typeof mockDb;
    clearAllSpy = vi.spyOn(DataLoader.prototype, 'clearAll');
  });

  afterEach(() => {
    clearAllSpy.mockRestore();
  });

  function createMockSelect(rows: Record<string, unknown>[]) {
    return vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(rows),
      }),
    });
  }

  function createMockSelectWithLimit(rows: Record<string, unknown>[]) {
    return vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows),
        }),
      }),
    });
  }

  describe('insert()', () => {
    it('should call productIdLoader.clearAll() after successful insert', async () => {
      const feature = new ProductFeature({
        id: 'feature-1',
        productId: 'product-1',
        name: 'Feature 1',
        emoji: '🚀',
        summary: 'A feature',
      });
      mockDb.transaction.mockResolvedValue(feature);
      const repository = new PostgresqlProductFeatureRepository(mockDb);

      const result = await repository.insert(feature);

      expect(result).toBe(feature);
      expect(clearAllSpy).toHaveBeenCalledTimes(1);
    });

    it('should not return a stale feature list from findManyByProductId after insert', async () => {
      const insertedRow = {
        id: 'feature-new',
        productId: 'product-1',
        name: 'New Feature',
        emoji: '🆕',
        summary: 'Freshly added',
        createdAt: new Date('2026-01-02'),
      };
      const insertedFeature = new ProductFeature({
        id: 'feature-new',
        productId: 'product-1',
        name: 'New Feature',
        emoji: '🆕',
        summary: 'Freshly added',
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([insertedRow]),
        }),
      });
      const mockReturning = vi.fn().mockResolvedValue([insertedRow]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

      mockDb.select = mockSelect;
      mockDb.insert = mockInsert;
      mockDb.transaction.mockImplementation(async (cb: (tx: typeof mockDb) => Promise<unknown>) => cb(mockDb));

      const repository = new PostgresqlProductFeatureRepository(mockDb);

      const beforeInsert = await repository.findManyByProductId('product-1');
      expect(beforeInsert).toEqual([]);

      await repository.insert(insertedFeature);
      const features = await repository.findManyByProductId('product-1');

      expect(features).toHaveLength(1);
      expect(features[0]?.id).toBe('feature-new');
      expect(features[0]?.summary).toBe('Freshly added');
    });
  });

  describe('updateById()', () => {
    it('should call productIdLoader.clearAll() after successful update', async () => {
      const feature = new ProductFeature({
        id: 'feature-1',
        productId: 'product-1',
        name: 'Feature 1',
        emoji: '🚀',
      });
      mockDb.transaction.mockResolvedValue(feature);
      const repository = new PostgresqlProductFeatureRepository(mockDb);

      const result = await repository.updateById('feature-1', (f: ProductFeature) => f);

      expect(result).toBe(feature);
      expect(clearAllSpy).toHaveBeenCalledTimes(1);
    });

    it('should not return stale data from findManyByProductId after updateById', async () => {
      const staleRow = {
        id: 'feature-1',
        productId: 'product-1',
        name: 'Stale Feature',
        emoji: '🥶',
        summary: 'Stale summary',
        createdAt: new Date('2026-01-01'),
      };
      const updatedRow = {
        id: 'feature-1',
        productId: 'product-1',
        name: 'Updated Feature',
        emoji: '🔥',
        summary: null,
        createdAt: new Date('2026-01-01'),
      };

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount += 1;
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(selectCallCount === 1 ? [staleRow] : [updatedRow]),
          }),
        };
      });

      const mockTxSelect = createMockSelectWithLimit([staleRow]);
      const mockReturning = vi.fn().mockResolvedValue([updatedRow]);
      const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) });
      const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

      mockDb.select = mockSelect;
      mockDb.update = mockUpdate;
      mockDb.transaction.mockImplementation(async (cb: (tx: typeof mockDb) => Promise<unknown>) => {
        const tx = { ...mockDb, select: mockTxSelect } as unknown as typeof mockDb;
        return cb(tx);
      });

      const repository = new PostgresqlProductFeatureRepository(mockDb);

      const beforeUpdate = await repository.findManyByProductId('product-1');
      expect(beforeUpdate).toHaveLength(1);
      expect(beforeUpdate[0]?.name).toBe('Stale Feature');
      expect(beforeUpdate[0]?.summary).toBe('Stale summary');

      await repository.updateById('feature-1', (f: ProductFeature) => {
        f.update({ name: 'Updated Feature', emoji: '🔥', summary: null });
        return f;
      });

      const afterUpdate = await repository.findManyByProductId('product-1');
      expect(afterUpdate).toHaveLength(1);
      expect(afterUpdate[0]?.name).toBe('Updated Feature');
      expect(afterUpdate[0]?.emoji).toBe('🔥');
      expect(afterUpdate[0]?.summary).toBeUndefined();
    });
  });
});
