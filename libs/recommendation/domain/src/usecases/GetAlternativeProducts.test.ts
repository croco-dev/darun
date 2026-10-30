import { Product, ProductTag, Tag, TagType } from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { AlternativeProduct } from '../entities/AlternativeProduct';
import type { AlternativeProductRepository } from '../repositories/AlternativeProductRepository';
import { AutoRecommender } from '../services/AutoRecommender';
import { GetAlternativeProducts } from './GetAlternativeProducts';

describe('GetAlternativeProducts', () => {
  const createProduct = (id: string, categoryIds: string[] = [], publishedAt?: Date) =>
    new Product({
      id,
      slug: id,
      name: id,
      summary: id,
      logoUrl: `${id}.png`,
      publishedAt: publishedAt ?? new Date('2026-01-01T00:00:00.000Z'),
      categoryIds,
    });

  const createTag = (name: string) => new Tag({ id: name, name, type: TagType.Featured });

  it('keeps manual alternatives first and fills missing slots from categories', async () => {
    const manual = [
      new AlternativeProduct({
        id: 'alt-1',
        productId: 'prod-1',
        alternativeProductId: 'manual-1',
      }),
      new AlternativeProduct({
        id: 'legacy-self',
        productId: 'prod-1',
        alternativeProductId: 'prod-1',
      }),
      new AlternativeProduct({
        id: 'alt-2',
        productId: 'prod-1',
        alternativeProductId: 'manual-2',
      }),
    ];
    const alternativeRepository = {
      replaceByProductId: vi.fn<AlternativeProductRepository['replaceByProductId']>(),
      findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue(manual),
      create: vi.fn<AlternativeProductRepository['create']>(),
      deleteMany: vi.fn<AlternativeProductRepository['deleteMany']>(),
      createMany: vi.fn<AlternativeProductRepository['createMany']>(),
    } satisfies AlternativeProductRepository;
    const productRepository = {
      findPublishedOneById: vi.fn().mockResolvedValue(createProduct('prod-1', ['cat-1'])),
      findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([]),
      findPublishedByCategoryIdAndLimit: vi
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
      {
        findPublishedByIds: vi.fn().mockImplementation(async (ids: string[]) => ids.map(id => createProduct(id))),
      },
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

  it.each([2, 5])('기존 자기 관계를 제외하고 정상 수동 대안의 순서를 유지한다 (%s건)', async count => {
    const ids = Array.from({ length: count }, (_, i) => `manual-${i + 1}`);
    const repository: AlternativeProductRepository = {
      replaceByProductId: vi.fn(),
      findManyByProductId: vi.fn().mockResolvedValue(
        [ids[0], 'source', ...ids.slice(1)].map(
          alternativeProductId =>
            new AlternativeProduct({
              productId: 'source',
              alternativeProductId,
            })
        )
      ),
      create: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    };

    const result = await new GetAlternativeProducts(repository, {
      findPublishedByIds: vi.fn().mockImplementation(async (ids: string[]) => ids.map(id => createProduct(id))),
    }).execute({
      productId: 'source',
    });
    expect(result.map(alternative => alternative.alternativeProductId)).toEqual(ids);
    expect(repository.deleteMany).not.toHaveBeenCalled();
  });

  it('ranks category matches before tag-only matches', async () => {
    const alternativeRepository = {
      replaceByProductId: vi.fn<AlternativeProductRepository['replaceByProductId']>(),
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
      findPublishedByCategoryIdAndLimit: vi
        .fn()
        .mockResolvedValue([createProduct('category-1', ['cat-1']), createProduct('category-2', ['cat-1'])]),
    };
    const tagRepository = {
      findOneByProductId: vi.fn().mockImplementation(async productId => {
        const tagsByProductId = new Map([
          [
            'prod-1',
            new ProductTag({
              productId: 'prod-1',
              tags: [createTag('ai'), createTag('crm')],
            }),
          ],
          [
            'category-1',
            new ProductTag({
              productId: 'category-1',
              tags: [createTag('ai')],
            }),
          ],
          [
            'tag-only',
            new ProductTag({
              productId: 'tag-only',
              tags: [createTag('ai'), createTag('crm')],
            }),
          ],
        ]);

        return tagsByProductId.get(productId) ?? null;
      }),
      findByProductIds: vi.fn().mockImplementation(async (ids: readonly string[]) => {
        const tagsByProductId = new Map([
          [
            'category-1',
            new ProductTag({
              productId: 'category-1',
              tags: [createTag('ai')],
            }),
          ],
          [
            'tag-only',
            new ProductTag({
              productId: 'tag-only',
              tags: [createTag('ai'), createTag('crm')],
            }),
          ],
        ]);

        return ids.map(id => tagsByProductId.get(id)).filter(Boolean) as ProductTag[];
      }),
    };

    const result = await new GetAlternativeProducts(
      alternativeRepository,
      {
        findPublishedByIds: vi.fn().mockImplementation(async (ids: string[]) => ids.map(id => createProduct(id))),
      },
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
      replaceByProductId: vi.fn<AlternativeProductRepository['replaceByProductId']>(),
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
      findPublishedByCategoryIdAndLimit: vi.fn().mockResolvedValue([]),
    };
    const tagRepository = {
      findOneByProductId: vi.fn().mockResolvedValue(new ProductTag({ productId: 'prod-1', tags: [createTag('ai')] })),
      findByProductIds: vi.fn().mockImplementation(async (ids: readonly string[]) => {
        return ids.map(id => new ProductTag({ productId: id, tags: [createTag('ai')] }));
      }),
    };

    await new GetAlternativeProducts(
      alternativeRepository,
      {
        findPublishedByIds: vi.fn().mockImplementation(async (ids: string[]) => ids.map(id => createProduct(id))),
      },
      new AutoRecommender(productRepository, tagRepository)
    ).execute({ productId: 'prod-1' });

    expect(tagRepository.findByProductIds).toHaveBeenCalledTimes(1);
    expect(tagRepository.findByProductIds).toHaveBeenCalledWith(['auto-1', 'auto-2', 'auto-3']);
  });

  it('deduplicates products appearing in multiple categories', async () => {
    const alternativeRepository = {
      replaceByProductId: vi.fn<AlternativeProductRepository['replaceByProductId']>(),
      findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue([]),
      create: vi.fn<AlternativeProductRepository['create']>(),
      deleteMany: vi.fn<AlternativeProductRepository['deleteMany']>(),
      createMany: vi.fn<AlternativeProductRepository['createMany']>(),
    } satisfies AlternativeProductRepository;
    const productRepository = {
      findPublishedOneById: vi.fn().mockResolvedValue(createProduct('prod-1', ['cat-1', 'cat-2'])),
      findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([]),
      findPublishedByCategoryIdAndLimit: vi.fn().mockImplementation(async (categoryId: string) => {
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
      {
        findPublishedByIds: vi.fn().mockImplementation(async (ids: string[]) => ids.map(id => createProduct(id))),
      },
      new AutoRecommender(productRepository, tagRepository)
    ).execute({ productId: 'prod-1' });

    expect(result.map(alternative => alternative.alternativeProductId)).toEqual(['dup-1', 'dup-2', 'dup-3']);
    expect(productRepository.findPublishedByCategoryIdAndLimit).toHaveBeenCalledTimes(2);
  });

  it('calls bounded category fetch with the candidate cap', async () => {
    const alternativeRepository = {
      replaceByProductId: vi.fn<AlternativeProductRepository['replaceByProductId']>(),
      findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue([]),
      create: vi.fn<AlternativeProductRepository['create']>(),
      deleteMany: vi.fn<AlternativeProductRepository['deleteMany']>(),
      createMany: vi.fn<AlternativeProductRepository['createMany']>(),
    } satisfies AlternativeProductRepository;
    const productRepository = {
      findPublishedOneById: vi.fn().mockResolvedValue(createProduct('prod-1', ['cat-1'])),
      findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([]),
      findPublishedByCategoryIdAndLimit: vi.fn().mockResolvedValue([]),
    };
    const tagRepository = {
      findOneByProductId: vi.fn().mockResolvedValue(null),
      findByProductIds: vi.fn().mockResolvedValue([]),
    };

    await new GetAlternativeProducts(
      alternativeRepository,
      {
        findPublishedByIds: vi.fn().mockImplementation(async (ids: string[]) => ids.map(id => createProduct(id))),
      },
      new AutoRecommender(productRepository, tagRepository)
    ).execute({ productId: 'prod-1' });

    expect(productRepository.findPublishedByCategoryIdAndLimit).toHaveBeenCalledWith('cat-1', 30);
  });

  it('uses tag overlap and latestness as tie-breakers without overriding category match', async () => {
    const alternativeRepository = {
      replaceByProductId: vi.fn<AlternativeProductRepository['replaceByProductId']>(),
      findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue([]),
      create: vi.fn<AlternativeProductRepository['create']>(),
      deleteMany: vi.fn<AlternativeProductRepository['deleteMany']>(),
      createMany: vi.fn<AlternativeProductRepository['createMany']>(),
    } satisfies AlternativeProductRepository;
    const ts = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const productRepository = {
      findPublishedOneById: vi.fn().mockResolvedValue(createProduct('prod-1', ['cat-1'])),
      findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([]),
      findPublishedByCategoryIdAndLimit: vi
        .fn()
        .mockResolvedValue([
          createProduct('cat-match-old', ['cat-1'], ts(48)),
          createProduct('cat-match-new', ['cat-1'], ts(1)),
        ]),
    };
    const tagRepository = {
      findOneByProductId: vi.fn().mockResolvedValue(null),
      findByProductIds: vi.fn().mockResolvedValue([]),
    };

    const result = await new GetAlternativeProducts(
      alternativeRepository,
      {
        findPublishedByIds: vi.fn().mockImplementation(async (ids: string[]) => ids.map(id => createProduct(id))),
      },
      new AutoRecommender(productRepository, tagRepository)
    ).execute({ productId: 'prod-1' });

    expect(result.map(a => a.alternativeProductId)).toEqual(['cat-match-new', 'cat-match-old']);
  });

  it('수동 대상을 한 번에 확인하고 중복·미발행 항목을 정원에서 제외한다', async () => {
    const repository: AlternativeProductRepository = {
      replaceByProductId: vi.fn(),
      findManyByProductId: vi.fn().mockResolvedValue(
        ['hidden', 'manual-2', 'source', 'manual-2', 'manual-1'].map(
          alternativeProductId =>
            new AlternativeProduct({
              productId: 'source',
              alternativeProductId,
            })
        )
      ),
      create: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    };
    const productReader = {
      findPublishedByIds: vi.fn().mockResolvedValue([null, createProduct('manual-2'), createProduct('manual-1')]),
    };
    const result = await new GetAlternativeProducts(repository, productReader).execute({ productId: 'source' });
    expect(result.map(row => row.alternativeProductId)).toEqual(['manual-2', 'manual-1']);
    expect(productReader.findPublishedByIds).toHaveBeenCalledExactlyOnceWith([
      'hidden',
      'manual-2',
      'manual-2',
      'manual-1',
    ]);
  });

  it('공개 대상 확인 실패를 정상 빈 목록으로 숨기지 않는다', async () => {
    const repository: AlternativeProductRepository = {
      replaceByProductId: vi.fn(),
      findManyByProductId: vi.fn().mockResolvedValue([
        new AlternativeProduct({
          productId: 'source',
          alternativeProductId: 'manual',
        }),
      ]),
      create: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    };
    const failure = new Error('synthetic publication lookup failure');
    const productReader = {
      findPublishedByIds: vi.fn().mockRejectedValue(failure),
    };
    await expect(
      new GetAlternativeProducts(repository, productReader).execute({
        productId: 'source',
      })
    ).rejects.toBe(failure);
  });
});
