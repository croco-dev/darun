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
        findPublishedByCategoryIdAndLimit: vi
          .fn<ProductRepository['findPublishedByCategoryIdAndLimit']>()
          .mockResolvedValue([]),
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

  it('expands candidate collection when unpublished products cause initial shortage', async () => {
    const published = [createProduct({ id: 'published-1' }), createProduct({ id: 'published-2' })];
    const allVotes = [
      { targetId: 'unpublished-1', count: 100 },
      { targetId: 'unpublished-2', count: 90 },
      { targetId: 'unpublished-3', count: 80 },
      { targetId: published[0].id, count: 50 },
      { targetId: published[1].id, count: 40 },
    ];

    const voteRepository = {
      findTopNByVoteCount: vi.fn().mockImplementation(async (n: number) => allVotes.slice(0, n)),
    } satisfies Pick<RankedProductVoteRepository, 'findTopNByVoteCount'>;

    const allProducts = new Map<string, Product | null>([
      ['unpublished-1', null],
      ['unpublished-2', null],
      ['unpublished-3', null],
      [published[0].id, published[0]],
      [published[1].id, published[1]],
    ]);

    const productRepository = {
      findPublishedByIds: vi
        .fn()
        .mockImplementation(async (ids: string[]) => ids.map(id => allProducts.get(id) ?? null)),
      findPublishedOneById: vi.fn().mockResolvedValue(null),
      findOneById: vi.fn().mockResolvedValue(null),
      findOneBySlug: vi.fn().mockResolvedValue(null),
      findPublishedOneBySlug: vi.fn().mockResolvedValue(null),
      findPublishedByCategoryId: vi.fn().mockResolvedValue([]),
      findAllByBeforeIdAndLimit: vi.fn().mockResolvedValue([]),
      findAllByAfterIdAndLimit: vi.fn().mockResolvedValue([]),
      findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([]),
      updateById: vi.fn(),
      findPublishedByCategoryIdAndLimit: vi.fn().mockResolvedValue([]),
      countPublishedAll: vi.fn().mockResolvedValue(0),
      countAll: vi.fn().mockResolvedValue(0),
      insert: vi.fn().mockResolvedValue(null),
    } satisfies ProductRepository;

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({
      limit: 2,
    });

    expect(result.map(p => p.id)).toEqual(['published-1', 'published-2']);
    expect(voteRepository.findTopNByVoteCount).toHaveBeenCalledTimes(2);
    expect(voteRepository.findTopNByVoteCount).toHaveBeenNthCalledWith(1, 4);
    expect(voteRepository.findTopNByVoteCount).toHaveBeenNthCalledWith(2, 6);
  });

  it('stops at hard cap when not enough published products exist', async () => {
    const allVotes = Array.from({ length: 29 }, (_, i) => ({ targetId: `unpublished-${i}`, count: 100 - i }));
    const published = createProduct({
      id: 'published-1',
      publishedAt: new Date(now.getTime() - 1 * MILLISECONDS_PER_HOUR),
    });
    allVotes.splice(4, 0, { targetId: published.id, count: 96 });
    allVotes.sort((a, b) => b.count - a.count);

    const voteRepository = {
      findTopNByVoteCount: vi.fn().mockImplementation(async (n: number) => allVotes.slice(0, n)),
    } satisfies Pick<RankedProductVoteRepository, 'findTopNByVoteCount'>;

    const allProducts = new Map<string, Product | null>(
      allVotes.map(v => [v.targetId, v.targetId === published.id ? published : null])
    );

    const productRepository = {
      findPublishedByIds: vi
        .fn()
        .mockImplementation(async (ids: string[]) => ids.map(id => allProducts.get(id) ?? null)),
      findPublishedOneById: vi.fn().mockResolvedValue(null),
      findOneById: vi.fn().mockResolvedValue(null),
      findOneBySlug: vi.fn().mockResolvedValue(null),
      findPublishedOneBySlug: vi.fn().mockResolvedValue(null),
      findPublishedByCategoryId: vi.fn().mockResolvedValue([]),
      findAllByBeforeIdAndLimit: vi.fn().mockResolvedValue([]),
      findAllByAfterIdAndLimit: vi.fn().mockResolvedValue([]),
      findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([]),
      updateById: vi.fn(),
      findPublishedByCategoryIdAndLimit: vi.fn().mockResolvedValue([]),
      countPublishedAll: vi.fn().mockResolvedValue(0),
      countAll: vi.fn().mockResolvedValue(0),
      insert: vi.fn().mockResolvedValue(null),
    } satisfies ProductRepository;

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({
      limit: 5,
    });

    expect(result.map(p => p.id)).toEqual(['published-1']);
    expect(voteRepository.findTopNByVoteCount).toHaveBeenCalledTimes(4);
    expect(voteRepository.findTopNByVoteCount).toHaveBeenNthCalledWith(1, 10);
    expect(voteRepository.findTopNByVoteCount).toHaveBeenNthCalledWith(2, 15);
    expect(voteRepository.findTopNByVoteCount).toHaveBeenNthCalledWith(3, 20);
    expect(voteRepository.findTopNByVoteCount).toHaveBeenNthCalledWith(4, 25);
  });

  it('breaks ties deterministically by publishedAt desc then id asc', async () => {
    const older = createProduct({ id: 'b-older', publishedAt: new Date(now.getTime() - 2 * MILLISECONDS_PER_HOUR) });
    const newer = createProduct({ id: 'a-newer', publishedAt: new Date(now.getTime() - 1 * MILLISECONDS_PER_HOUR) });

    const { voteRepository, productRepository } = createRepository({
      votes: [
        { targetId: newer.id, count: 10 },
        { targetId: older.id, count: 10 },
      ],
      products: [older, newer],
    });

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 2 });

    expect(result.map(p => p.id)).toEqual(['a-newer', 'b-older']);
  });

  it('breaks ties by id asc when scores and publishedAt are equal', async () => {
    const p1 = createProduct({ id: 'p-b' });
    const p2 = createProduct({ id: 'p-a' });

    const { voteRepository, productRepository } = createRepository({
      votes: [
        { targetId: p1.id, count: 5 },
        { targetId: p2.id, count: 5 },
      ],
      products: [p1, p2],
    });

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 2 });

    expect(result.map(p => p.id)).toEqual(['p-a', 'p-b']);
  });

  it('includes recent low-vote products from the latest-published buffer', async () => {
    const p1 = createProduct({ id: 'p1', publishedAt: new Date(now.getTime() - 72 * MILLISECONDS_PER_HOUR) });
    const p2 = createProduct({ id: 'p2', publishedAt: new Date(now.getTime() - 48 * MILLISECONDS_PER_HOUR) });
    const p3 = createProduct({ id: 'p3', publishedAt: new Date(now.getTime() - 1 * MILLISECONDS_PER_HOUR) });

    const { voteRepository, productRepository } = createRepository({
      votes: [
        { targetId: p1.id, count: 10 },
        { targetId: p2.id, count: 5 },
      ],
      products: [p1, p2],
    });

    productRepository.findTopNSortByPublishedAtDesc.mockResolvedValue([p3]);

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 3 });

    expect(result).toHaveLength(3);
    expect(result.map(p => p.id)).toContain(p3.id);
    expect(productRepository.findTopNSortByPublishedAtDesc).toHaveBeenCalledWith(expect.any(Number));
  });

  it('deduplicates products present in both vote and latest-published sources', async () => {
    const p1 = createProduct({ id: 'p1', publishedAt: new Date(now.getTime() - 72 * MILLISECONDS_PER_HOUR) });
    const p2 = createProduct({ id: 'p2', publishedAt: new Date(now.getTime() - 48 * MILLISECONDS_PER_HOUR) });

    const { voteRepository, productRepository } = createRepository({
      votes: [
        { targetId: p1.id, count: 10 },
        { targetId: p2.id, count: 5 },
      ],
      products: [p1, p2],
    });

    productRepository.findTopNSortByPublishedAtDesc.mockResolvedValue([p1]);

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 2 });

    const p1Occurrences = result.filter(p => p.id === p1.id);
    expect(p1Occurrences).toHaveLength(1);
    expect(result).toHaveLength(2);
  });

  it('lets a zero-vote latest product into the scoring set via the latest buffer', async () => {
    const oldHighVote = createProduct({
      id: 'old-high',
      publishedAt: new Date(now.getTime() - 72 * MILLISECONDS_PER_HOUR),
    });
    const latestZeroVote = createProduct({
      id: 'latest-zero',
      publishedAt: new Date(now.getTime() - 1 * MILLISECONDS_PER_HOUR),
    });

    const { voteRepository, productRepository } = createRepository({
      votes: [{ targetId: oldHighVote.id, count: 100 }],
      products: [oldHighVote],
    });

    productRepository.findTopNSortByPublishedAtDesc.mockResolvedValue([latestZeroVote]);

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 2 });

    expect(result.map(p => p.id)).toEqual([oldHighVote.id, latestZeroVote.id]);
    expect(productRepository.findTopNSortByPublishedAtDesc).toHaveBeenCalledWith(expect.any(Number));
  });

  it('does not drop latest buffer candidates when low-vote recent products are filtered out by votes', async () => {
    const oldHighVote = createProduct({
      id: 'old-high',
      publishedAt: new Date(now.getTime() - 72 * MILLISECONDS_PER_HOUR),
    });
    const recentLowVote = createProduct({
      id: 'recent-low',
      publishedAt: new Date(now.getTime() - 2 * MILLISECONDS_PER_HOUR),
    });

    const { voteRepository, productRepository } = createRepository({
      votes: [{ targetId: oldHighVote.id, count: 100 }],
      products: [oldHighVote],
    });

    productRepository.findTopNSortByPublishedAtDesc.mockResolvedValue([recentLowVote]);

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 2 });

    expect(result.map(p => p.id)).toEqual([oldHighVote.id, recentLowVote.id]);
  });

  it('keeps candidate collection and scoring separate for unpublished high-vote products', async () => {
    const unpublishedHighVoteId = 'unpublished-high';
    const publishedLowVote = createProduct({
      id: 'published-low',
      publishedAt: new Date(now.getTime() - 48 * MILLISECONDS_PER_HOUR),
    });

    const voteRepository = {
      findTopNByVoteCount: vi.fn().mockImplementation(async (n: number) =>
        [
          { targetId: unpublishedHighVoteId, count: 1000 },
          { targetId: publishedLowVote.id, count: 2 },
        ].slice(0, n)
      ),
    } satisfies Pick<RankedProductVoteRepository, 'findTopNByVoteCount'>;

    const productRepository = {
      findPublishedByIds: vi
        .fn()
        .mockImplementation(async (ids: string[]) =>
          ids.map(id => (id === publishedLowVote.id ? publishedLowVote : null))
        ),
      findPublishedOneById: vi.fn().mockResolvedValue(null),
      findOneById: vi.fn().mockResolvedValue(null),
      findOneBySlug: vi.fn().mockResolvedValue(null),
      findPublishedOneBySlug: vi.fn().mockResolvedValue(null),
      findPublishedByCategoryId: vi.fn().mockResolvedValue([]),
      findAllByBeforeIdAndLimit: vi.fn().mockResolvedValue([]),
      findAllByAfterIdAndLimit: vi.fn().mockResolvedValue([]),
      findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([]),
      updateById: vi.fn(),
      findPublishedByCategoryIdAndLimit: vi.fn().mockResolvedValue([]),
      countPublishedAll: vi.fn().mockResolvedValue(0),
      countAll: vi.fn().mockResolvedValue(0),
      insert: vi.fn().mockResolvedValue(null),
    } satisfies ProductRepository;

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 1 });

    expect(result.map(p => p.id)).toEqual([publishedLowVote.id]);
    expect(voteRepository.findTopNByVoteCount).toHaveBeenCalledWith(2);
  });

  it('uses deterministic tie-breaking by publishedAt desc then id asc with log-scaled vote gaps', async () => {
    const highOld = createProduct({
      id: 'high-old',
      publishedAt: new Date(now.getTime() - 6 * MILLISECONDS_PER_HOUR),
    });
    const lowRecent = createProduct({
      id: 'low-recent',
      publishedAt: new Date(now.getTime() - 3 * MILLISECONDS_PER_HOUR),
    });
    const midAged = createProduct({
      id: 'mid-aged',
      publishedAt: new Date(now.getTime() - 12 * MILLISECONDS_PER_HOUR),
    });

    const { voteRepository, productRepository } = createRepository({
      votes: [
        { targetId: highOld.id, count: 100 },
        { targetId: lowRecent.id, count: 1 },
        { targetId: midAged.id, count: 50 },
      ],
      products: [highOld, lowRecent, midAged],
    });

    const result = await new GetRankedProducts(voteRepository, productRepository, () => now).execute({ limit: 3 });

    expect(result.map(p => p.id)).toEqual(['high-old', 'mid-aged', 'low-recent']);
  });
});

describe('RankingService', () => {
  it('calculates score with fixed gravity and new product boost', () => {
    const createdAt = new Date(NOW.getTime() - 1 * MILLISECONDS_PER_HOUR);
    const score = new RankingService(() => NOW).calculateScore(10, 1, createdAt);

    expect(score).toBeCloseTo((Math.log1p(10) / Math.pow(1 + 2, 0.6)) * 1.5);
  });

  it('produces a zero score when there are no votes', () => {
    const createdAt = new Date(NOW.getTime() - 1 * MILLISECONDS_PER_HOUR);
    const score = new RankingService(() => NOW).calculateScore(0, 1, createdAt);

    expect(score).toBe(0);
  });

  it('ranks a recent low-vote product above an older high-vote product under log-scaled influence', () => {
    const getNow = () => new Date('2026-06-17T00:00:00.000Z');
    const service = new RankingService(getNow);

    const oldPublishedAt = new Date('2026-05-18T00:00:00.000Z');
    const recentPublishedAt = new Date('2026-06-16T12:00:00.000Z');

    const oldAgeHours = (getNow().getTime() - oldPublishedAt.getTime()) / MILLISECONDS_PER_HOUR;
    const recentAgeHours = (getNow().getTime() - recentPublishedAt.getTime()) / MILLISECONDS_PER_HOUR;

    const oldScore = service.calculateScore(1000, oldAgeHours, oldPublishedAt);
    const recentScore = service.calculateScore(10, recentAgeHours, recentPublishedAt);

    expect(recentScore).toBeGreaterThan(oldScore);
  });
});

describe('RankingCache', () => {
  it('returns cached scores before the TTL expires', () => {
    const cache = new RankingCache(() => 1000);

    cache.set('p1', 5, 10, 12);

    expect(cache.get('p1', 5, 10)).toBe(12);
  });

  it('returns undefined after the TTL expires', () => {
    let now = 1000;
    const cache = new RankingCache(() => now);

    cache.set('p1', 5, 10, 12);
    now += 300_001;

    expect(cache.get('p1', 5, 10)).toBeUndefined();
  });

  it('invalidates scores by product id', () => {
    const cache = new RankingCache(() => 1000);

    cache.set('p1', 5, 10, 12);
    cache.invalidate('p1');

    expect(cache.get('p1', 5, 10)).toBeUndefined();
  });

  it('does not reuse cached score when vote count changes for the same product', () => {
    const cache = new RankingCache(() => 1000);

    cache.set('p1', 5, 10, 12);

    expect(cache.get('p1', 6, 10)).toBeUndefined();
  });

  it('does not reuse cached score when age bucket changes for the same product', () => {
    const cache = new RankingCache(() => 1000);

    cache.set('p1', 5, 10, 12);

    expect(cache.get('p1', 5, 11)).toBeUndefined();
  });

  it('invalidates all composite keys for the same product id', () => {
    const cache = new RankingCache(() => 1000);

    cache.set('p1', 5, 10, 12);
    cache.set('p1', 6, 11, 13);
    cache.invalidate('p1');

    expect(cache.get('p1', 5, 10)).toBeUndefined();
    expect(cache.get('p1', 6, 11)).toBeUndefined();
  });

  it('preserves other product entries when invalidating one product', () => {
    const cache = new RankingCache(() => 1000);

    cache.set('p1', 5, 10, 12);
    cache.set('p2', 3, 8, 9);
    cache.invalidate('p1');

    expect(cache.get('p2', 3, 8)).toBe(9);
  });
});
