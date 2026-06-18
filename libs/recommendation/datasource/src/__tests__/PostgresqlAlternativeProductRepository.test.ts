import { AlternativeProduct } from '@darun/recommendation-domain';
import DataLoader from 'dataloader';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresqlAlternativeProductRepository } from '../repositories/PostgresqlAlternativeProductRepository';

type DrizzleDb = ConstructorParameters<typeof PostgresqlAlternativeProductRepository>[0];

type MockedDb = Pick<DrizzleDb, 'transaction'> & {
  select: MockSelect;
};

type MockTransaction = {
  delete: (...args: unknown[]) => { where: ReturnType<typeof vi.fn> };
  insert: (...args: unknown[]) => { values: (...args: unknown[]) => { returning: ReturnType<typeof vi.fn> } };
};

type MockWhere = (() => Promise<unknown[]>) & ReturnType<typeof vi.fn>;
type MockFrom = (() => { where: MockWhere }) & ReturnType<typeof vi.fn>;
type MockSelect = (() => { from: MockFrom }) & ReturnType<typeof vi.fn>;

const expectAlternativeProductShape = (value: unknown) => {
  expect(value).toBeInstanceOf(AlternativeProduct);
  expect(value).toHaveProperty('id');
  expect(value).toHaveProperty('productId');
  expect(value).toHaveProperty('alternativeProductId');
};

describe('PostgresqlAlternativeProductRepository', () => {
  let repository: PostgresqlAlternativeProductRepository;
  let mockTxDeleteWhere: ReturnType<typeof vi.fn>;
  let mockTxReturning: ReturnType<typeof vi.fn>;
  let mockTx: {
    delete: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
  };
  let mockDb: MockedDb;
  let mockSelect: ReturnType<typeof vi.fn>;
  let clearAllSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAllSpy = vi.spyOn(DataLoader.prototype, 'clearAll');

    mockTxDeleteWhere = vi.fn().mockResolvedValue({ count: 2 });
    mockTxReturning = vi.fn().mockResolvedValue([
      { id: 'new-1', productId: 'p1', alternativeProductId: 'alt-1' },
    ]);

    mockTx = {
      delete: vi.fn(() => ({ where: mockTxDeleteWhere })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: mockTxReturning,
        })),
      })),
    };

    const mockWhere = vi.fn() as MockWhere;
    mockSelect = vi.fn().mockResolvedValue([
      { id: '1', productId: 'p1', alternativeProductId: 'alt-1', createdAt: new Date() },
    ]) as MockWhere;
    mockWhere.mockImplementation(() => (mockSelect as MockWhere)());

    mockDb = {
      select: (() => ({
        from: () => ({
          where: mockWhere,
        }),
      })) as MockSelect,
      transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx as unknown as MockTransaction)),
    } as MockedDb;

    repository = new PostgresqlAlternativeProductRepository(mockDb as unknown as DrizzleDb);
  });

  describe('domain mapping contract', () => {
    it('findManyByProductId returns domain AlternativeProduct instances, not raw rows', async () => {
      const result = await repository.findManyByProductId('p1');

      expect(result).toHaveLength(1);
      expectAlternativeProductShape(result[0]);
      expect(clearAllSpy).not.toHaveBeenCalled();
    });

    it('create returns a domain AlternativeProduct instance, not a raw inserted row', async () => {
      const alternative = new AlternativeProduct({
        productId: 'p1',
        alternativeProductId: 'alt-1',
      });

      const result = await repository.create(alternative);

      expectAlternativeProductShape(result);
    });

    it('createMany returns domain AlternativeProduct instances, not raw inserted rows', async () => {
      mockTxReturning.mockResolvedValueOnce([
        { id: 'new-1', productId: 'p1', alternativeProductId: 'alt-1' },
        { id: 'new-2', productId: 'p2', alternativeProductId: 'alt-2' },
      ]);

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

      const result = await repository.createMany(alternatives);

      expect(result).toHaveLength(2);
      result.forEach(expectAlternativeProductShape);
    });
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

      expect(clearAllSpy).toHaveBeenCalledTimes(1);
    });

    it('returns true when deleted count equals input length', async () => {
      const alternatives = [
        new AlternativeProduct({ id: '1', productId: 'p1', alternativeProductId: 'alt-1' }),
        new AlternativeProduct({ id: '2', productId: 'p1', alternativeProductId: 'alt-2' }),
      ];

      const result = await repository.deleteMany(alternatives);

      expect(result).toBe(true);
    });

    it('returns false when deleted count does not equal input length', async () => {
      const alternatives = [
        new AlternativeProduct({ id: '1', productId: 'p1', alternativeProductId: 'alt-1' }),
        new AlternativeProduct({ id: '2', productId: 'p1', alternativeProductId: 'alt-2' }),
      ];
      mockTxDeleteWhere.mockResolvedValueOnce({ count: 1 });

      const result = await repository.deleteMany(alternatives);

      expect(result).toBe(false);
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

      expect(clearAllSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should call productIdLoader.clearAll() after creating a single alternative', async () => {
      const alternative = new AlternativeProduct({
        productId: 'p1',
        alternativeProductId: 'alt-1',
      });

      await repository.create(alternative);

      expect(clearAllSpy).toHaveBeenCalledTimes(1);
    });

    it('returns fresh alternatives from findManyByProductId after create', async () => {
      mockSelect
        .mockResolvedValueOnce([
          { id: 'stale-1', productId: 'p1', alternativeProductId: 'alt-stale', createdAt: new Date() },
        ])
        .mockResolvedValueOnce([
          { id: 'stale-1', productId: 'p1', alternativeProductId: 'alt-stale', createdAt: new Date() },
          { id: 'created-1', productId: 'p1', alternativeProductId: 'alt-new', createdAt: new Date() },
        ]);
      mockTxReturning.mockResolvedValueOnce([
        { id: 'created-1', productId: 'p1', alternativeProductId: 'alt-new' },
      ]);

      const before = await repository.findManyByProductId('p1');
      expect(before.map(a => a.alternativeProductId)).toEqual(['alt-stale']);

      const alternative = new AlternativeProduct({ productId: 'p1', alternativeProductId: 'alt-new' });
      await repository.create(alternative);

      const after = await repository.findManyByProductId('p1');

      expect(after.map(a => a.alternativeProductId)).toEqual(
        expect.arrayContaining(['alt-stale', 'alt-new'])
      );
      expect(after).toHaveLength(2);
      expect(clearAllSpy).toHaveBeenCalled();
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

      expect(clearAllSpy).toHaveBeenCalledTimes(1);
    });

    it('returns fresh alternatives from findManyByProductId after createMany', async () => {
      mockSelect
        .mockResolvedValueOnce([
          { id: 'stale-1', productId: 'p1', alternativeProductId: 'alt-stale', createdAt: new Date() },
        ])
        .mockResolvedValueOnce([
          { id: 'stale-1', productId: 'p1', alternativeProductId: 'alt-stale', createdAt: new Date() },
          { id: 'created-1', productId: 'p1', alternativeProductId: 'alt-1', createdAt: new Date() },
          { id: 'created-2', productId: 'p1', alternativeProductId: 'alt-2', createdAt: new Date() },
        ]);
      mockTxReturning.mockResolvedValueOnce([
        { id: 'created-1', productId: 'p1', alternativeProductId: 'alt-1' },
        { id: 'created-2', productId: 'p1', alternativeProductId: 'alt-2' },
      ]);

      const before = await repository.findManyByProductId('p1');
      expect(before.map(a => a.alternativeProductId)).toEqual(['alt-stale']);

      const alternatives = [
        new AlternativeProduct({ productId: 'p1', alternativeProductId: 'alt-1' }),
        new AlternativeProduct({ productId: 'p1', alternativeProductId: 'alt-2' }),
      ];
      await repository.createMany(alternatives);

      const after = await repository.findManyByProductId('p1');

      expect(after.map(a => a.alternativeProductId)).toEqual(
        expect.arrayContaining(['alt-stale', 'alt-1', 'alt-2'])
      );
      expect(after).toHaveLength(3);
      expect(clearAllSpy).toHaveBeenCalled();
    });
  });

  describe('deleteMany', () => {
    it('returns fresh alternatives from findManyByProductId after deleteMany', async () => {
      mockSelect
        .mockResolvedValueOnce([
          { id: 'removed-1', productId: 'p1', alternativeProductId: 'alt-removed', createdAt: new Date() },
          { id: 'remaining-1', productId: 'p1', alternativeProductId: 'alt-remaining', createdAt: new Date() },
        ])
        .mockResolvedValueOnce([
          { id: 'remaining-1', productId: 'p1', alternativeProductId: 'alt-remaining', createdAt: new Date() },
        ]);
      mockTxDeleteWhere.mockResolvedValueOnce({ count: 1 });

      const before = await repository.findManyByProductId('p1');
      expect(before.map(a => a.alternativeProductId)).toEqual(
        expect.arrayContaining(['alt-removed', 'alt-remaining'])
      );

      const alternatives = [
        new AlternativeProduct({ id: 'removed-1', productId: 'p1', alternativeProductId: 'alt-removed' }),
      ];
      await repository.deleteMany(alternatives);

      const after = await repository.findManyByProductId('p1');

      expect(after.map(a => a.alternativeProductId)).not.toContain('alt-removed');
      expect(after.map(a => a.alternativeProductId)).toContain('alt-remaining');
      expect(after).toHaveLength(1);
      expect(clearAllSpy).toHaveBeenCalled();
    });
  });
});
