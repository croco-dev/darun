import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import { ProductFeature } from '../entities/ProductFeature';
import { ProductLink } from '../entities/ProductLink';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import { ProductTag } from '../entities/ProductTag';
import { Tag } from '../entities/Tag';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import type { ProductLinkRepository } from '../repositories/ProductLinkRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import type { ProductTagRepository } from '../repositories/ProductTagRepository';
import { GetAllProducts } from '../usecases/GetAllProducts';

const product = (id: string) => new Product({ id, slug: id, name: id, summary: id, logoUrl: `${id}.png` });

const productRepository = (products: Product[]) =>
  ({
    updateById: vi.fn<ProductRepository['updateById']>(),
    findAllByBeforeIdAndLimit: vi.fn<ProductRepository['findAllByBeforeIdAndLimit']>().mockResolvedValue(products),
    findAllByAfterIdAndLimit: vi.fn<ProductRepository['findAllByAfterIdAndLimit']>().mockResolvedValue(products),
    findPublishedByAfterIdAndLimit: vi
      .fn<ProductRepository['findPublishedByAfterIdAndLimit']>()
      .mockResolvedValue(products),
    findTopNSortByPublishedAtDesc: vi.fn<ProductRepository['findTopNSortByPublishedAtDesc']>().mockResolvedValue([]),
    findPublishedByIds: vi.fn<ProductRepository['findPublishedByIds']>().mockResolvedValue([]),
    findPublishedOneById: vi.fn<ProductRepository['findPublishedOneById']>().mockResolvedValue(null),
    findOneBySlug: vi.fn<ProductRepository['findOneBySlug']>().mockResolvedValue(null),
    findOneById: vi.fn<ProductRepository['findOneById']>().mockResolvedValue(null),
    findPublishedOneBySlug: vi.fn<ProductRepository['findPublishedOneBySlug']>().mockResolvedValue(null),
    findPublishedByCategoryId: vi.fn<ProductRepository['findPublishedByCategoryId']>().mockResolvedValue([]),
    findPublishedByCategoryIdAndLimit: vi
      .fn<ProductRepository['findPublishedByCategoryIdAndLimit']>()
      .mockResolvedValue([]),
    countPublishedAll: vi.fn<ProductRepository['countPublishedAll']>().mockResolvedValue(0),
    countAll: vi.fn<ProductRepository['countAll']>().mockResolvedValue(products.length),
    insert: vi.fn<ProductRepository['insert']>().mockResolvedValue(null),
  }) satisfies ProductRepository;

const relatedRepositories = () => ({
  links: {
    insert: vi.fn(),
    findManyByProductId: vi.fn(async productId => [
      new ProductLink({ id: `link-${productId}`, productId, title: '', link: '', displayLink: '', iconUrl: '' }),
    ]),
    updateById: vi.fn(),
  } satisfies ProductLinkRepository,
  tags: {
    upsert: vi.fn(),
    findOneByProductId: vi.fn<ProductTagRepository['findOneByProductId']>(
      async productId => new ProductTag({ productId, tags: [new Tag({ id: `tag-${productId}`, name: '' })] })
    ),
    findByProductIds: vi.fn(async () => []),
  } satisfies ProductTagRepository,
  screenshots: {
    findManyByProductIdSortByPriorityDesc: vi.fn(async productId => [
      { id: `screenshot-${productId}`, productId, imageUrl: '', imageAlt: '' },
    ]),
    findById: vi.fn(),
    insert: vi.fn(),
    deleteById: vi.fn(),
  } satisfies ProductScreenshotRepository,
  features: {
    updateById: vi.fn(),
    findOneById: vi.fn(),
    findManyByProductId: vi.fn(async productId => [
      new ProductFeature({ id: `feature-${productId}`, productId, name: '', emoji: '' }),
    ]),
    insert: vi.fn(),
  } satisfies ProductFeatureRepository,
});

describe('GetAllProducts', () => {
  it('preloads page products and related fields through repository loaders', async () => {
    const repository = productRepository([product('p1'), product('p2'), product('p3')]);
    const related = relatedRepositories();

    const result = await new GetAllProducts(
      repository,
      related.links,
      related.tags,
      related.screenshots,
      related.features
    ).execute({ limit: 3 });

    expect(result.total).toBe(3);
    expect(repository.findOneById).toHaveBeenCalledTimes(3);
    expect(related.links.findManyByProductId).toHaveBeenCalledTimes(3);
    expect(related.tags.findOneByProductId).toHaveBeenCalledTimes(3);
    expect(related.screenshots.findManyByProductIdSortByPriorityDesc).toHaveBeenCalledTimes(3);
    expect(related.features.findManyByProductId).toHaveBeenCalledTimes(3);
    expect(result.products[0]).toMatchObject({
      __preloadedLinks: [{ id: 'link-p1', isPrimary: true }],
      __preloadedTags: [{ id: 'tag-p1' }],
      __preloadedScreenshots: [{ id: 'screenshot-p1' }],
      __preloadedFeatures: [{ id: 'feature-p1' }],
    });
  });

  it('skips preload work when the page is empty', async () => {
    const repository = productRepository([]);

    await expect(new GetAllProducts(repository).execute({ limit: 10 })).resolves.toEqual({ products: [], total: 0 });
    expect(repository.findOneById).not.toHaveBeenCalled();
  });

  it('returns empty preloadedLinks when product has no links', async () => {
    const repository = productRepository([product('p1')]);
    const related = relatedRepositories();
    related.links.findManyByProductId.mockResolvedValue([]);

    const result = await new GetAllProducts(
      repository,
      related.links,
      related.tags,
      related.screenshots,
      related.features
    ).execute({ limit: 1 });

    expect(result.products[0].__preloadedLinks).toEqual([]);
  });

  it('returns empty preloadedTags when product has no tags', async () => {
    const repository = productRepository([product('p1')]);
    const related = relatedRepositories();
    related.tags.findOneByProductId.mockResolvedValue(null);

    const result = await new GetAllProducts(
      repository,
      related.links,
      related.tags,
      related.screenshots,
      related.features
    ).execute({ limit: 1 });

    expect(result.products[0].__preloadedTags).toEqual([]);
  });

  it('returns empty preloadedScreenshots when product has no screenshots', async () => {
    const repository = productRepository([product('p1')]);
    const related = relatedRepositories();
    related.screenshots.findManyByProductIdSortByPriorityDesc.mockResolvedValue([]);

    const result = await new GetAllProducts(
      repository,
      related.links,
      related.tags,
      related.screenshots,
      related.features
    ).execute({ limit: 1 });

    expect(result.products[0].__preloadedScreenshots).toEqual([]);
  });

  it('returns empty preloadedFeatures when product has no features', async () => {
    const repository = productRepository([product('p1')]);
    const related = relatedRepositories();
    related.features.findManyByProductId.mockResolvedValue([]);

    const result = await new GetAllProducts(
      repository,
      related.links,
      related.tags,
      related.screenshots,
      related.features
    ).execute({ limit: 1 });

    expect(result.products[0].__preloadedFeatures).toEqual([]);
  });

  it('preserves per-product preload independence and ordering with mixed data across 3 products', async () => {
    const repository = productRepository([product('p1'), product('p2'), product('p3')]);
    const related = relatedRepositories();

    related.links.findManyByProductId.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    related.tags.findOneByProductId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        new ProductTag({
          productId: 'p2',
          tags: [new Tag({ id: 'tag-p2', name: 'test' })],
        })
      )
      .mockResolvedValueOnce(null);

    related.screenshots.findManyByProductIdSortByPriorityDesc
      .mockResolvedValueOnce([new ProductScreenshot({ productId: 'p1', imageUrl: '', imageAlt: '' })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    related.features.findManyByProductId
      .mockResolvedValueOnce([new ProductFeature({ productId: 'p1', name: '', emoji: '' })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await new GetAllProducts(
      repository,
      related.links,
      related.tags,
      related.screenshots,
      related.features
    ).execute({ limit: 3 });

    expect(result.products).toHaveLength(3);
    // p1: links empty, tags null → empty, screenshots present, features present
    expect(result.products[0].__preloadedLinks).toEqual([]);
    expect(result.products[0].__preloadedTags).toEqual([]);
    expect(result.products[0].__preloadedScreenshots).toHaveLength(1);
    expect(result.products[0].__preloadedFeatures).toHaveLength(1);
    // p2: links empty, tags present, screenshots empty, features empty
    expect(result.products[1].__preloadedLinks).toEqual([]);
    expect(result.products[1].__preloadedTags).toHaveLength(1);
    expect(result.products[1].__preloadedScreenshots).toEqual([]);
    expect(result.products[1].__preloadedFeatures).toEqual([]);
    // p3: links empty, tags null → empty, screenshots empty, features empty
    expect(result.products[2].__preloadedLinks).toEqual([]);
    expect(result.products[2].__preloadedTags).toEqual([]);
    expect(result.products[2].__preloadedScreenshots).toEqual([]);
    expect(result.products[2].__preloadedFeatures).toEqual([]);
  });

  it('falls back gracefully when some related repositories are not injected', async () => {
    const repository = productRepository([product('p1')]);

    const result = await new GetAllProducts(repository).execute({ limit: 1 });

    expect(result.products).toHaveLength(1);
    expect(repository.findOneById).toHaveBeenCalledTimes(1);
    expect(result.products[0].__preloadedLinks).toBeUndefined();
    expect(result.products[0].__preloadedTags).toBeUndefined();
    expect(result.products[0].__preloadedScreenshots).toBeUndefined();
    expect(result.products[0].__preloadedFeatures).toBeUndefined();
  });

  it('isolates per-product relation call rejections without crashing the entire preload', async () => {
    const repository = productRepository([product('p1'), product('p2')]);
    const related = relatedRepositories();

    related.tags.findOneByProductId
      .mockResolvedValueOnce(new ProductTag({ productId: 'p1', tags: [new Tag({ id: 'tag-p1', name: 'test' })] }))
      .mockRejectedValueOnce(new Error('DB timeout'));

    related.screenshots.findManyByProductIdSortByPriorityDesc
      .mockResolvedValueOnce([new ProductScreenshot({ productId: 'p1', imageUrl: '', imageAlt: '' })])
      .mockRejectedValueOnce(new Error('DB timeout'));

    const result = await new GetAllProducts(
      repository,
      related.links,
      related.tags,
      related.screenshots,
      related.features
    ).execute({ limit: 2 });

    expect(result.products).toHaveLength(2);
    // p1 tags succeed
    expect(result.products[0].__preloadedTags).toHaveLength(1);
    // p2 tags rejected → []
    expect(result.products[1].__preloadedTags).toEqual([]);
    // p1 screenshots succeed
    expect(result.products[0].__preloadedScreenshots).toHaveLength(1);
    // p2 screenshots rejected → []
    expect(result.products[1].__preloadedScreenshots).toEqual([]);
    // Links are not rejected, default mock returns data
    expect(result.products[0].__preloadedLinks).toHaveLength(1);
    expect(result.products[1].__preloadedLinks).toHaveLength(1);
    // Features are not rejected, default mock returns data
    expect(result.products[0].__preloadedFeatures).toHaveLength(1);
    expect(result.products[1].__preloadedFeatures).toHaveLength(1);
  });
});
