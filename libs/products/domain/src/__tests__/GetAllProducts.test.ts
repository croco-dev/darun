import { describe, expect, it, vi } from 'vitest';
import type { ProductRepository } from '../repositories/ProductRepository';
import { GetAllProducts } from '../usecases/GetAllProducts';

function repository(): ProductRepository {
  return {
    updateById: vi.fn(),
    findAllByBeforeIdAndLimit: vi.fn().mockResolvedValue([]),
    findAllByAfterIdAndLimit: vi.fn().mockResolvedValue([]),
    findPublishedByAfterIdAndLimit: vi.fn(),
    findTopNSortByPublishedAtDesc: vi.fn(),
    findPublishedByIds: vi.fn(),
    findPublishedOneById: vi.fn(),
    findOneBySlug: vi.fn(),
    findOneById: vi.fn(),
    findPublishedOneBySlug: vi.fn(),
    findPublishedByCategoryId: vi.fn(),
    findPublishedByCategoryIdAndLimit: vi.fn(),
    countPublishedByCategoryId: vi.fn(),
    findVisualApps: vi.fn(),
    findVisualAppCover: vi.fn(),
    countVisualAppScreenshots: vi.fn(),
    hasPublishedAlternatives: vi.fn(),
    countPublishedAll: vi.fn(),
    countAll: vi.fn().mockResolvedValue(42),
    insert: vi.fn(),
  };
}

describe('GetAllProducts', () => {
  it('reads only the requested page and total, without priming individual products', async () => {
    const repo = repository();
    const result = await new GetAllProducts(repo).execute({ limit: 30, cursor: { id: 'cursor' } });
    expect(repo.findAllByAfterIdAndLimit).toHaveBeenCalledWith(30, 'cursor');
    expect(repo.findOneById).not.toHaveBeenCalled();
    expect(result).toEqual({ products: [], total: 42 });
  });
  it('preserves reverse pagination arguments', async () => {
    const repo = repository();
    await new GetAllProducts(repo).execute({ limit: 10, cursor: { id: 'cursor' }, type: 'before' });
    expect(repo.findAllByBeforeIdAndLimit).toHaveBeenCalledWith(10, 'cursor');
    expect(repo.findAllByAfterIdAndLimit).not.toHaveBeenCalled();
  });
});
