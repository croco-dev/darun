import { ProductFeature, ProductLink } from '@darun/products-domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostgresqlProductFeatureRepository } from '../repositories/PostgresqlProductFeatureRepository';
import { PostgresqlProductLinkRepository } from '../repositories/PostgresqlProductLinkRepository';

vi.hoisted(() => {
  process.env.VOTE_IP_SALT = 'test-salt';
});

const { mockClearAll } = vi.hoisted(() => ({
  mockClearAll: vi.fn(),
}));

vi.mock('dataloader', () => ({
  default: vi.fn(function () {
    return {
      load: vi.fn(),
      clearAll: mockClearAll,
    };
  }),
}));

describe('PostgresqlProductFeatureRepository', () => {
  const mockTx = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };

  const mockDb = {
    transaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));
  });

  describe('insert()', () => {
    it('should call clearAll() after insert()', async () => {
      const repo = new PostgresqlProductFeatureRepository(
        mockDb as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      );
      const feature = new ProductFeature({
        id: 'feature-1',
        name: 'Test Feature',
        emoji: '🚀',
        productId: 'product-1',
      });

      mockTx.returning.mockResolvedValue([feature]);

      const result = await repo.insert(feature);

      expect(result).toEqual(feature);
      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });

    it('should return the inserted feature', async () => {
      const repo = new PostgresqlProductFeatureRepository(
        mockDb as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      );
      const feature = new ProductFeature({
        id: 'feature-2',
        name: 'Another Feature',
        emoji: '✨',
        productId: 'product-1',
      });

      mockTx.returning.mockResolvedValue([feature]);

      const result = await repo.insert(feature);

      expect(result.id).toBe('feature-2');
      expect(result.name).toBe('Another Feature');
      expect(result.emoji).toBe('✨');
      expect(result.productId).toBe('product-1');
    });
  });

  describe('updateById()', () => {
    it('should call clearAll() after updateById()', async () => {
      const repo = new PostgresqlProductFeatureRepository(
        mockDb as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      );
      const existingFeature = new ProductFeature({
        id: 'feature-1',
        name: 'Original',
        emoji: '🚀',
        productId: 'product-1',
      });
      const updatedFeature = new ProductFeature({
        id: 'feature-1',
        name: 'Updated',
        emoji: '🔥',
        productId: 'product-1',
      });

      mockTx.limit.mockResolvedValue([existingFeature]);
      mockTx.returning.mockResolvedValue([updatedFeature]);

      const result = await repo.updateById('feature-1', f => {
        f.update({ name: 'Updated', emoji: '🔥' });
        return f;
      });

      expect(result).toEqual(updatedFeature);
      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });
  });
});

describe('PostgresqlProductLinkRepository', () => {
  const mockTx = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };

  const mockDb = {
    transaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));
  });

  describe('insert()', () => {
    it('should call clearAll() after insert()', async () => {
      const repo = new PostgresqlProductLinkRepository(
        mockDb as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      );
      const link = new ProductLink({
        id: 'link-1',
        title: 'Test Link',
        link: 'https://example.com',
        displayLink: 'example.com',
        iconUrl: 'https://example.com/icon.png',
        productId: 'product-1',
      });

      mockTx.returning.mockResolvedValue([link]);

      const result = await repo.insert(link);

      expect(result).toEqual(link);
      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });

    it('should return the inserted link', async () => {
      const repo = new PostgresqlProductLinkRepository(
        mockDb as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      );
      const link = new ProductLink({
        id: 'link-2',
        title: 'Docs',
        link: 'https://docs.example.com',
        displayLink: 'docs.example.com',
        iconUrl: 'https://example.com/docs-icon.png',
        productId: 'product-2',
      });

      mockTx.returning.mockResolvedValue([link]);

      const result = await repo.insert(link);

      expect(result.id).toBe('link-2');
      expect(result.title).toBe('Docs');
      expect(result.link).toBe('https://docs.example.com');
      expect(result.productId).toBe('product-2');
    });
  });

  describe('updateById()', () => {
    it('should call clearAll() after updateById()', async () => {
      const repo = new PostgresqlProductLinkRepository(
        mockDb as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      );
      const existingLink = new ProductLink({
        id: 'link-1',
        title: 'Original',
        link: 'https://example.com',
        displayLink: 'example.com',
        iconUrl: 'https://example.com/icon.png',
        productId: 'product-1',
      });
      const updatedLink = new ProductLink({
        id: 'link-1',
        title: 'Updated',
        link: 'https://updated.example.com',
        displayLink: 'updated.example.com',
        iconUrl: 'https://example.com/new-icon.png',
        productId: 'product-1',
      });

      mockTx.limit.mockResolvedValue([existingLink]);
      mockTx.returning.mockResolvedValue([updatedLink]);

      const result = await repo.updateById('link-1', l => {
        l.update({
          title: 'Updated',
          link: 'https://updated.example.com',
          displayLink: 'updated.example.com',
          iconUrl: 'https://example.com/new-icon.png',
        });
        return l;
      });

      expect(result).toEqual(updatedLink);
      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });
  });
});
