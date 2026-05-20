import { describe, expect, it, vi } from 'vitest';
import { Vote, type VoteRepository } from '@darun/voting-domain';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
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

  const createVote = (targetId: string) => new Vote({ targetId });

  const productMap = (map: Record<string, Product | null>) =>
    vi.fn<ProductRepository['findPublishedOneById']>().mockImplementation((id: string) => Promise.resolve(map[id] ?? null));

  const createVoteRepository = (votes: Vote[]): VoteRepository => ({
    upsertByTargetId: vi.fn<VoteRepository['upsertByTargetId']>(),
    findByTargetId: vi.fn<VoteRepository['findByTargetId']>().mockResolvedValue(null),
    findTopNByVoteCount: vi.fn<VoteRepository['findTopNByVoteCount']>().mockResolvedValue(votes),
  });

  const createProductRepository = (
    findPublishedOneById: ProductRepository['findPublishedOneById']
  ): ProductRepository => ({
    updateById: vi.fn<ProductRepository['updateById']>(),
    findAllByBeforeIdAndLimit: vi.fn<ProductRepository['findAllByBeforeIdAndLimit']>().mockResolvedValue([]),
    findAllByAfterIdAndLimit: vi.fn<ProductRepository['findAllByAfterIdAndLimit']>().mockResolvedValue([]),
    findTopNSortByPublishedAtDesc: vi.fn<ProductRepository['findTopNSortByPublishedAtDesc']>().mockResolvedValue([]),
    findPublishedByIds: vi.fn<ProductRepository['findPublishedByIds']>().mockResolvedValue([]),
    findPublishedOneById,
    findOneBySlug: vi.fn<ProductRepository['findOneBySlug']>().mockResolvedValue(null),
    findOneById: vi.fn<ProductRepository['findOneById']>().mockResolvedValue(null),
    findPublishedOneBySlug: vi.fn<ProductRepository['findPublishedOneBySlug']>().mockResolvedValue(null),
    findPublishedByCategoryId: vi.fn<ProductRepository['findPublishedByCategoryId']>().mockResolvedValue([]),
    countPublishedAll: vi.fn<ProductRepository['countPublishedAll']>().mockResolvedValue(0),
    countAll: vi.fn<ProductRepository['countAll']>().mockResolvedValue(0),
    insert: vi.fn<ProductRepository['insert']>().mockResolvedValue(null),
  });

  it('should return all products when all votes resolve successfully', async () => {
    const product1 = createProduct('p1');
    const product2 = createProduct('p2');

    const mockVoteRepository = createVoteRepository([createVote('p1'), createVote('p2')]);
    const mockProductRepository = createProductRepository(productMap({ p1: product1, p2: product2 }));

    const useCase = new GetRankedProducts(mockVoteRepository, mockProductRepository);

    const result = await useCase.execute({ limit: 10 });

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(product1);
    expect(result[1]).toBe(product2);
  });

  it('should filter out null products when some are not found', async () => {
    const product1 = createProduct('p1');

    const mockVoteRepository = createVoteRepository([createVote('p1'), createVote('p2')]);
    const mockProductRepository = createProductRepository(productMap({ p1: product1 }));

    const useCase = new GetRankedProducts(mockVoteRepository, mockProductRepository);

    const result = await useCase.execute({ limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(product1);
  });

  it('should not lose all results when one vote query rejects', async () => {
    const product2 = createProduct('p2');

    const mockVoteRepository = createVoteRepository([createVote('p1'), createVote('p2'), createVote('p3')]);
    const mockProductRepository = createProductRepository(
      vi.fn<ProductRepository['findPublishedOneById']>().mockImplementation((id: string) => {
        if (id === 'p2') return Promise.resolve(product2);
        return Promise.reject(new Error(`${id} not found`));
      })
    );

    const useCase = new GetRankedProducts(mockVoteRepository, mockProductRepository);

    const result = await useCase.execute({ limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(product2);
  });

  it('should apply limit correctly', async () => {
    const p1 = createProduct('p1');
    const p2 = createProduct('p2');
    const p3 = createProduct('p3');

    const mockVoteRepository = createVoteRepository([createVote('p1'), createVote('p2'), createVote('p3')]);
    const mockProductRepository = createProductRepository(productMap({ p1, p2, p3 }));

    const useCase = new GetRankedProducts(mockVoteRepository, mockProductRepository);

    const result = await useCase.execute({ limit: 2 });

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(p1);
    expect(result[1]).toBe(p2);
  });
});
