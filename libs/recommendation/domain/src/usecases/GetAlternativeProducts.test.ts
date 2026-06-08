import { Product, ProductTag, Tag, TagType } from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { AlternativeProduct } from '../entities/AlternativeProduct';
import type { AlternativeProductRepository } from '../repositories/AlternativeProductRepository';
import { AutoRecommender } from '../services/AutoRecommender';
import { GetAlternativeProducts } from './GetAlternativeProducts';

describe('GetAlternativeProducts', () => {
  const createProduct = (id: string, categoryIds: string[] = []) =>
    new Product({ id, slug: id, name: id, summary: id, logoUrl: `${id}.png`, publishedAt: new Date(), categoryIds });

  const createTag = (name: string) => new Tag({ id: name, name, type: TagType.Featured });

  it('keeps manual alternatives first and fills missing slots from categories', async () => {
    const manual = [
      new AlternativeProduct({ id: 'alt-1', productId: 'prod-1', alternativeProductId: 'manual-1' }),
      new AlternativeProduct({ id: 'alt-2', productId: 'prod-1', alternativeProductId: 'manual-2' }),
    ];
    const alternativeRepository = {
      findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue(manual),
      create: vi.fn<AlternativeProductRepository['create']>(),
      deleteMany: vi.fn<AlternativeProductRepository['deleteMany']>(),
      createMany: vi.fn<AlternativeProductRepository['createMany']>(),
    } satisfies AlternativeProductRepository;
    const productRepository = {
      findPublishedOneById: vi.fn().mockResolvedValue(createProduct('prod-1', ['cat-1'])),
      findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([]),
      findPublishedByCategoryId: vi
        .fn()
        .mockResolvedValue([
          createProduct('prod-1', ['cat-1']),
          createProduct('manual-1', ['cat-1']),
          createProduct('auto-1', ['cat-1']),
          createProduct('auto-2', ['cat-1']),
          createProduct('auto-3', ['cat-1']),
          createProduct('auto-4', ['cat-1']),
        ]),
    };
    const tagRepository = {
      findOneByProductId: vi.fn().mockResolvedValue(null),
      findByProductIds: vi.fn().mockResolvedValue([]),
    };

    const result = await new GetAlternativeProducts(
      alternativeRepository,
      new AutoRecommender(productRepository, tagRepository)
    ).execute({ productId: 'prod-1' });

    expect(result.map(alternative => alternative.alternativeProductId)).toEqual([
      'manual-1',
      'manual-2',
      'auto-1',
      'auto-2',
      'auto-3',
    ]);
  });

  it('ranks category matches before tag-only matches', async () => {
    const alternativeRepository = {
      findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue([]),
      create: vi.fn<AlternativeProductRepository['create']>(),
      deleteMany: vi.fn<AlternativeProductRepository['deleteMany']>(),
      createMany: vi.fn<AlternativeProductRepository['createMany']>(),
    } satisfies AlternativeProductRepository;
    const productRepository = {
      findPublishedOneById: vi.fn().mockResolvedValue(createProduct('prod-1', ['cat-1'])),
      findTopNSortByPublishedAtDesc: vi
        .fn()
        .mockResolvedValue([createProduct('tag-only'), createProduct('category-1', ['cat-1'])]),
      findPublishedByCategoryId: vi
        .fn()
        .mockResolvedValue([createProduct('category-1', ['cat-1']), createProduct('category-2', ['cat-1'])]),
    };
    const tagRepository = {
      findOneByProductId: vi.fn().mockImplementation(async productId => {
        const tagsByProductId = new Map([
          ['prod-1', new ProductTag({ productId: 'prod-1', tags: [createTag('ai'), createTag('crm')] })],
          ['category-1', new ProductTag({ productId: 'category-1', tags: [createTag('ai')] })],
          ['tag-only', new ProductTag({ productId: 'tag-only', tags: [createTag('ai'), createTag('crm')] })],
        ]);

        return tagsByProductId.get(productId) ?? null;
      }),
      findByProductIds: vi.fn().mockImplementation(async (ids: readonly string[]) => {
        const tagsByProductId = new Map([
          ['category-1', new ProductTag({ productId: 'category-1', tags: [createTag('ai')] })],
          ['tag-only', new ProductTag({ productId: 'tag-only', tags: [createTag('ai'), createTag('crm')] })],
        ]);

        return ids.map(id => tagsByProductId.get(id)).filter(Boolean) as ProductTag[];
      }),
    };

    const result = await new GetAlternativeProducts(
      alternativeRepository,
      new AutoRecommender(productRepository, tagRepository)
    ).execute({ productId: 'prod-1' });

    expect(result.map(alternative => alternative.alternativeProductId)).toEqual([
      'category-1',
      'category-2',
      'tag-only',
    ]);
  });

  it('batches tag lookup into a single call', async () => {
    const alternativeRepository = {
      findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue([]),
      create: vi.fn<AlternativeProductRepository['create']>(),
      deleteMany: vi.fn<AlternativeProductRepository['deleteMany']>(),
      createMany: vi.fn<AlternativeProductRepository['createMany']>(),
    } satisfies AlternativeProductRepository;
    const productRepository = {
      findPublishedOneById: vi.fn().mockResolvedValue(createProduct('prod-1', ['cat-1'])),
      findTopNSortByPublishedAtDesc: vi
        .fn()
        .mockResolvedValue([createProduct('auto-1'), createProduct('auto-2'), createProduct('auto-3')]),
      findPublishedByCategoryId: vi.fn().mockResolvedValue([]),
    };
    const tagRepository = {
      findOneByProductId: vi.fn().mockResolvedValue(new ProductTag({ productId: 'prod-1', tags: [createTag('ai')] })),
      findByProductIds: vi.fn().mockImplementation(async (ids: readonly string[]) => {
        return ids.map(id => new ProductTag({ productId: id, tags: [createTag('ai')] }));
      }),
    };

    await new GetAlternativeProducts(
      alternativeRepository,
      new AutoRecommender(productRepository, tagRepository)
    ).execute({ productId: 'prod-1' });

    expect(tagRepository.findByProductIds).toHaveBeenCalledTimes(1);
    expect(tagRepository.findByProductIds).toHaveBeenCalledWith(['auto-1', 'auto-2', 'auto-3']);
  });

  it('deduplicates products appearing in multiple categories', async () => {
    const alternativeRepository = {
      findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue([]),
      create: vi.fn<AlternativeProductRepository['create']>(),
      deleteMany: vi.fn<AlternativeProductRepository['deleteMany']>(),
      createMany: vi.fn<AlternativeProductRepository['createMany']>(),
    } satisfies AlternativeProductRepository;
    const productRepository = {
      findPublishedOneById: vi.fn().mockResolvedValue(createProduct('prod-1', ['cat-1', 'cat-2'])),
      findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([]),
      findPublishedByCategoryId: vi.fn().mockImplementation(async (categoryId: string) => {
        if (categoryId === 'cat-1') {
          return [createProduct('dup-1', ['cat-1']), createProduct('dup-2', ['cat-1'])];
        }
        return [createProduct('dup-1', ['cat-2']), createProduct('dup-3', ['cat-2'])];
      }),
    };
    const tagRepository = {
      findOneByProductId: vi.fn().mockResolvedValue(null),
      findByProductIds: vi.fn().mockResolvedValue([]),
    };

    const result = await new GetAlternativeProducts(
      alternativeRepository,
      new AutoRecommender(productRepository, tagRepository)
    ).execute({ productId: 'prod-1' });

    expect(result.map(alternative => alternative.alternativeProductId)).toEqual(['dup-1', 'dup-2', 'dup-3']);
    expect(productRepository.findPublishedByCategoryId).toHaveBeenCalledTimes(2);
  });
});
