import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import { ProductFeature } from '../entities/ProductFeature';
import { ProductLink } from '../entities/ProductLink';
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
    findTopNSortByPublishedAtDesc: vi.fn<ProductRepository['findTopNSortByPublishedAtDesc']>().mockResolvedValue([]),
    findPublishedByIds: vi.fn<ProductRepository['findPublishedByIds']>().mockResolvedValue([]),
    findPublishedOneById: vi.fn<ProductRepository['findPublishedOneById']>().mockResolvedValue(null),
    findOneBySlug: vi.fn<ProductRepository['findOneBySlug']>().mockResolvedValue(null),
    findOneById: vi.fn<ProductRepository['findOneById']>().mockResolvedValue(null),
    findPublishedOneBySlug: vi.fn<ProductRepository['findPublishedOneBySlug']>().mockResolvedValue(null),
    findPublishedByCategoryId: vi.fn<ProductRepository['findPublishedByCategoryId']>().mockResolvedValue([]),
    countPublishedAll: vi.fn<ProductRepository['countPublishedAll']>().mockResolvedValue(0),
    countAll: vi.fn<ProductRepository['countAll']>().mockResolvedValue(products.length),
    insert: vi.fn<ProductRepository['insert']>().mockResolvedValue(null),
  }) satisfies ProductRepository;

const relatedRepositories = () => ({
  links: { insert: vi.fn(), findManyByProductId: vi.fn(async productId => [new ProductLink({ id: `link-${productId}`, productId, title: '', link: '', displayLink: '', iconUrl: '' })]), updateById: vi.fn() } satisfies ProductLinkRepository,
  tags: { upsert: vi.fn(), findOneByProductId: vi.fn(async productId => new ProductTag({ productId, tags: [new Tag({ id: `tag-${productId}`, name: '' })] })) } satisfies ProductTagRepository,
  screenshots: { findManyByProductIdSortByPriorityDesc: vi.fn(async productId => [{ id: `screenshot-${productId}`, productId, imageUrl: '', imageAlt: '' }]), findById: vi.fn(), insert: vi.fn(), deleteById: vi.fn() } satisfies ProductScreenshotRepository,
  features: { updateById: vi.fn(), findOneById: vi.fn(), findManyByProductId: vi.fn(async productId => [new ProductFeature({ id: `feature-${productId}`, productId, name: '', emoji: '' })]), insert: vi.fn() } satisfies ProductFeatureRepository,
});

describe('GetAllProducts', () => {
  it('preloads page products and related fields through repository loaders', async () => {
    const repository = productRepository([product('p1'), product('p2'), product('p3')]);
    const related = relatedRepositories();

    const result = await new GetAllProducts(repository, related.links, related.tags, related.screenshots, related.features).execute({ limit: 3 });

    expect(result.total).toBe(3);
    expect(repository.findOneById).toHaveBeenCalledTimes(3);
    expect(related.links.findManyByProductId).toHaveBeenCalledTimes(3);
    expect(related.tags.findOneByProductId).toHaveBeenCalledTimes(3);
    expect(related.screenshots.findManyByProductIdSortByPriorityDesc).toHaveBeenCalledTimes(3);
    expect(related.features.findManyByProductId).toHaveBeenCalledTimes(3);
    expect(result.products[0]).toMatchObject({ __preloadedLinks: [{ id: 'link-p1', isPrimary: true }], __preloadedTags: [{ id: 'tag-p1' }], __preloadedScreenshots: [{ id: 'screenshot-p1' }], __preloadedFeatures: [{ id: 'feature-p1' }] });
  });

  it('skips preload work when the page is empty', async () => {
    const repository = productRepository([]);

    await expect(new GetAllProducts(repository).execute({ limit: 10 })).resolves.toEqual({ products: [], total: 0 });
    expect(repository.findOneById).not.toHaveBeenCalled();
  });
});
