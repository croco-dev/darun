import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import type { RankedProductVoteRepository } from '../repositories/RankedProductVoteRepository';
import { RankingCache } from '../services/RankingCache';
import { RankingService } from '../services/RankingService';
import { GetRankedProducts } from '../usecases/GetRankedProducts';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-01-01T12:00:00.000Z');

describe('GetRankedProducts', () => {
  const now = NOW;

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
    const older = createProduct({ id: 'older', publishedAt: new Date(now.getTime() - 72 * MILLISECONDS_PER_HOUR) });
    const recent = createProduct({ id: 'recent', publishedAt: new Date(now.getTime() - 1 * MILLISECONDS_PER_HOUR) });
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

  it('boosts products published within 24 hours', async () => {
    const newProduct = createProduct({ id: 'new', publishedAt: new Date(now.getTime() - 1 * MILLISECONDS_PER_HOUR) });
    const oldProduct = createProduct({ id: 'old', publishedAt: new Date(now.getTime() - 72 * MILLISECONDS_PER_HOUR) });
    const { voteRepository, productRepository } = createRepository({
      votes: [
        { targetId: oldProduct.id, count: 20 },
        { targetId: newProduct.id, count: 10 },
      ],
      products: [oldProduct, newProduct],
    });

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 2 });

    expect(result).toEqual([newProduct, oldProduct]);
  });

  it('keeps existing vote counts compatible with the new ranking formula', async () => {
    const product = createProduct({ id: 'p1', publishedAt: new Date(now.getTime() - 48 * MILLISECONDS_PER_HOUR) });
    const { voteRepository, productRepository } = createRepository({
      votes: [{ targetId: product.id, count: 10 }],
      products: [product],
    });

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 1 });

    expect(result).toEqual([product]);
    expect(voteRepository.findTopNByVoteCount).toHaveBeenCalledWith(2);
  });
});

describe('RankingService', () => {
  it('calculates score with fixed gravity and new product boost', () => {
    const createdAt = new Date(NOW.getTime() - 1 * MILLISECONDS_PER_HOUR);
    const score = new RankingService(() => NOW).calculateScore(10, 1, createdAt);

    expect(score).toBeCloseTo((10 / Math.pow(1 + 2, 0.6)) * 1.5);
  });
});

describe('RankingCache', () => {
  it('returns cached scores before the TTL expires', () => {
    const cache = new RankingCache(() => 1000);

    cache.set('p1', 12);

    expect(cache.get('p1')).toBe(12);
  });

  it('returns undefined after the TTL expires', () => {
    let now = 1000;
    const cache = new RankingCache(() => now);

    cache.set('p1', 12);
    now += 300_001;

    expect(cache.get('p1')).toBeUndefined();
  });

  it('invalidates scores by product id', () => {
    const cache = new RankingCache(() => 1000);

    cache.set('p1', 12);
    cache.invalidate('p1');

    expect(cache.get('p1')).toBeUndefined();
  });
});
