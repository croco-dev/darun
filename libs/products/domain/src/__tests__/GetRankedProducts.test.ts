import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import { GetRankedProducts } from '../usecases/GetRankedProducts';

describe('GetRankedProducts', () => {
  const createProduct = (id: string) =>
    new Product({
      id,
      name: `Product ${id}`,
      slug: `product-${id}`,
      summary: `Summary of ${id}`,
      logoUrl: `https://example.com/${id}.png`,
      categoryIds: [],
    });

  const productMap = (map: Record<string, Product | null>) =>
    vi.fn().mockImplementation((id: string) => Promise.resolve(map[id] ?? null));

  it('should return all products when all votes resolve successfully', async () => {
    const product1 = createProduct('p1');
    const product2 = createProduct('p2');

    const mockVoteRepository = {
      findTopNByVoteCount: vi.fn().mockResolvedValue([{ targetId: 'p1' }, { targetId: 'p2' }]),
    };

    const mockProductRepository = {
      findPublishedOneById: productMap({ p1: product1, p2: product2 }),
    };

    const useCase = new GetRankedProducts(mockVoteRepository as any, mockProductRepository as any);

    const result = await useCase.execute({ limit: 10 });

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(product1);
    expect(result[1]).toBe(product2);
  });

  it('should filter out null products when some are not found', async () => {
    const product1 = createProduct('p1');

    const mockVoteRepository = {
      findTopNByVoteCount: vi.fn().mockResolvedValue([{ targetId: 'p1' }, { targetId: 'p2' }]),
    };

    const mockProductRepository = {
      findPublishedOneById: productMap({ p1: product1 }),
    };

    const useCase = new GetRankedProducts(mockVoteRepository as any, mockProductRepository as any);

    const result = await useCase.execute({ limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(product1);
  });

  it('should not lose all results when one vote query rejects', async () => {
    const product2 = createProduct('p2');

    const mockVoteRepository = {
      findTopNByVoteCount: vi.fn().mockResolvedValue([{ targetId: 'p1' }, { targetId: 'p2' }, { targetId: 'p3' }]),
    };

    const mockProductRepository = {
      findPublishedOneById: vi.fn().mockImplementation((id: string) => {
        if (id === 'p2') return Promise.resolve(product2);
        return Promise.reject(new Error(`${id} not found`));
      }),
    };

    const useCase = new GetRankedProducts(mockVoteRepository as any, mockProductRepository as any);

    const result = await useCase.execute({ limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(product2);
  });

  it('should apply limit correctly', async () => {
    const p1 = createProduct('p1');
    const p2 = createProduct('p2');
    const p3 = createProduct('p3');

    const mockVoteRepository = {
      findTopNByVoteCount: vi.fn().mockResolvedValue([{ targetId: 'p1' }, { targetId: 'p2' }, { targetId: 'p3' }]),
    };

    const mockProductRepository = {
      findPublishedOneById: productMap({ p1, p2, p3 }),
    };

    const useCase = new GetRankedProducts(mockVoteRepository as any, mockProductRepository as any);

    const result = await useCase.execute({ limit: 2 });

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(p1);
    expect(result[1]).toBe(p2);
  });
});
