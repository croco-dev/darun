import { AlternativeProduct } from '@darun/recommendation-domain';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresqlAlternativeProductRepository } from '../repositories/PostgresqlAlternativeProductRepository';

const mockClearAll = vi.fn();
const mockLoad = vi.fn();

vi.mock('dataloader', () => ({
  default: function () {
    return { load: mockLoad, clearAll: mockClearAll };
  },
}));

describe('PostgresqlAlternativeProductRepository', () => {
  let repository: PostgresqlAlternativeProductRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockTxDeleteWhere = vi.fn().mockResolvedValue({ count: 2 });
    const mockTxReturning = vi
      .fn()
      .mockResolvedValue([{ id: 'new-1', productId: 'p1', alternativeProductId: 'alt-1' }]);

    const mockTx = {
      delete: vi.fn(() => ({ where: mockTxDeleteWhere })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: mockTxReturning,
        })),
      })),
    };

    const mockDb = {
      transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
    };

    repository = new PostgresqlAlternativeProductRepository(mockDb as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  describe('deleteMany', () => {
    it('should call productIdLoader.clearAll() after deletion', async () => {
      const alternatives = [
        new AlternativeProduct({
          id: '1',
          productId: 'p1',
          alternativeProductId: 'alt-1',
        }),
        new AlternativeProduct({
          id: '2',
          productId: 'p1',
          alternativeProductId: 'alt-2',
        }),
      ];

      await repository.deleteMany(alternatives);

      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('createMany', () => {
    it('should call productIdLoader.clearAll() after creating alternatives', async () => {
      const alternatives = [
        new AlternativeProduct({
          productId: 'p1',
          alternativeProductId: 'alt-1',
        }),
        new AlternativeProduct({
          productId: 'p2',
          alternativeProductId: 'alt-2',
        }),
      ];

      await repository.createMany(alternatives);

      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should call productIdLoader.clearAll() after creating a single alternative', async () => {
      const alternative = new AlternativeProduct({
        productId: 'p1',
        alternativeProductId: 'alt-1',
      });

      await repository.create(alternative);

      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });
  });
});
