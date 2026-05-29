import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import type { RankedProductVoteRepository } from '../repositories/RankedProductVoteRepository';
import { GetRankedProducts } from '../usecases/GetRankedProducts';

describe('GetRankedProducts', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');

  const createProduct = ({ id, publishedAt = now }: { id: string; publishedAt?: Date }) =>
    new Product({
      id,
      slug: `product-${id}`,
      name: `Product ${id}`,
      summary: `Summary ${id}`,
      logoUrl: `https://example.com/${id}.png`,
      publishedAt,
    });

  const createRepository = ({
    votes,
    products = [],
  }: {
    votes: Awaited<ReturnType<RankedProductVoteRepository['findTopNByVoteCount']>>;
    products?: Product[];
  }) => {
    const productById = new Map(products.map(product => [product.id, product]));

    return {
      voteRepository: {
        findTopNByVoteCount: vi.fn<RankedProductVoteRepository['findTopNByVoteCount']>().mockResolvedValue(votes),
      },
      productRepository: {
        updateById: vi.fn<ProductRepository['updateById']>(),
        findAllByBeforeIdAndLimit: vi.fn<ProductRepository['findAllByBeforeIdAndLimit']>().mockResolvedValue([]),
        findAllByAfterIdAndLimit: vi.fn<ProductRepository['findAllByAfterIdAndLimit']>().mockResolvedValue([]),
        findTopNSortByPublishedAtDesc: vi
          .fn<ProductRepository['findTopNSortByPublishedAtDesc']>()
          .mockResolvedValue([]),
        findPublishedByIds: vi
          .fn<ProductRepository['findPublishedByIds']>()
          .mockImplementation(async ids => ids.map(id => productById.get(id) ?? null)),
        findPublishedOneById: vi.fn<ProductRepository['findPublishedOneById']>().mockResolvedValue(null),
        findOneBySlug: vi.fn<ProductRepository['findOneBySlug']>().mockResolvedValue(null),
        findOneById: vi.fn<ProductRepository['findOneById']>().mockResolvedValue(null),
        findPublishedOneBySlug: vi.fn<ProductRepository['findPublishedOneBySlug']>().mockResolvedValue(null),
        findPublishedByCategoryId: vi.fn<ProductRepository['findPublishedByCategoryId']>().mockResolvedValue([]),
        countPublishedAll: vi.fn<ProductRepository['countPublishedAll']>().mockResolvedValue(0),
        countAll: vi.fn<ProductRepository['countAll']>().mockResolvedValue(0),
        insert: vi.fn<ProductRepository['insert']>().mockResolvedValue(null),
      } satisfies ProductRepository,
    };
  };

  it('applies time decay so a recent product ranks higher', async () => {
    const older = createProduct({ id: 'older', publishedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000) });
    const recent = createProduct({ id: 'recent', publishedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000) });
    const { voteRepository, productRepository } = createRepository({
      votes: [
        { targetId: older.id, count: 40 },
        { targetId: recent.id, count: 20 },
      ],
      products: [older, recent],
    });

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 2 });

    expect(result).toEqual([recent, older]);
  });

  it('loads ranked products in one batch instead of one query per vote', async () => {
    const p1 = createProduct({ id: 'p1' });
    const p2 = createProduct({ id: 'p2' });
    const p3 = createProduct({ id: 'p3' });
    const { voteRepository, productRepository } = createRepository({
      votes: [
        { targetId: p1.id, count: 3 },
        { targetId: p2.id, count: 2 },
        { targetId: p3.id, count: 1 },
      ],
      products: [p1, p2, p3],
    });

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 2 });

    expect(result).toEqual([p1, p2]);
    expect(productRepository.findPublishedByIds).toHaveBeenCalledTimes(1);
    expect(productRepository.findPublishedByIds).toHaveBeenCalledWith(['p1', 'p2', 'p3']);
    expect(productRepository.findPublishedOneById).not.toHaveBeenCalled();
  });

  it('returns an empty array when there are no ranked votes', async () => {
    const { voteRepository, productRepository } = createRepository({ votes: [] });

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 10 });

    expect(result).toEqual([]);
    expect(productRepository.findPublishedByIds).not.toHaveBeenCalled();
  });
});
