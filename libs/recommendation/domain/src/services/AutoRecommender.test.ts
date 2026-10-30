import 'reflect-metadata';
import { Product, ProductTag, Tag, TagType } from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { AutoRecommender } from './AutoRecommender';

const product = (id: string, categoryIds: string[] = [], publishedAt = '2026-01-01') =>
  new Product({
    id,
    name: id,
    slug: id,
    summary: '',
    logoUrl: '',
    categoryIds,
    publishedAt: new Date(publishedAt),
  });

describe('AutoRecommender category reads', () => {
  it('starts category reads together but preserves original category order and deduplicates', async () => {
    const pending = new Map<string, (products: Product[]) => void>();
    const reader = {
      findPublishedOneById: vi.fn().mockResolvedValue(product('source', ['a', 'b'])),
      findPublishedByCategoryIdAndLimit: vi.fn(
        (id: string) =>
          new Promise<Product[]>(resolve => {
            pending.set(id, resolve);
          })
      ),
      findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([]),
    };
    const recommender = new AutoRecommender(reader, {
      findOneByProductId: vi.fn().mockResolvedValue(null),
      findByProductIds: vi.fn().mockResolvedValue([]),
    });
    const result = recommender.recommend({ productId: 'source', limit: 3 });
    await Promise.resolve();
    expect([...pending.keys()]).toEqual(['a', 'b']);
    pending.get('b')!([product('b-only'), product('shared')]);
    pending.get('a')!([product('a-only'), product('shared')]);
    expect((await result).map(item => item.alternativeProductId)).toEqual(['shared', 'a-only', 'b-only']);
  });
});

describe('AutoRecommender tag scoring', () => {
  it('scores older category candidates and overlapping recent candidates once in one bounded batch', async () => {
    const source = product('source', ['category']);
    const older = product('older-matching-tags', [], '2020-01-01');
    const overlap = product('recent-overlap', [], '2025-01-01');
    const recentOnly = product('recent-tag-only');
    const noise = Array.from({ length: 45 }, (_, i) => product(`unrelated-${i}`));
    const reader = {
      findPublishedOneById: vi.fn().mockResolvedValue(source),
      findPublishedByCategoryIdAndLimit: vi
        .fn()
        .mockResolvedValue([
          source,
          product('manual'),
          product('newer-no-matching-tags'),
          older,
          overlap,
          product('missing-tags', [], '2019-01-01'),
        ]),
      findTopNSortByPublishedAtDesc: vi
        .fn()
        .mockResolvedValue([source, product('manual'), overlap, overlap, recentOnly, ...noise]),
    };
    const tags = (productId: string, names: string[]) =>
      new ProductTag({
        productId,
        tags: names.map(name => new Tag({ id: name, name, type: TagType.Featured })),
      });
    const storedTags = [
      tags(older.id, ['ai', 'crm']),
      tags(overlap.id, ['ai']),
      tags(recentOnly.id, ['ai', 'crm']),
      tags('newer-no-matching-tags', ['unrelated']),
    ];
    const tagRepository = {
      findOneByProductId: vi.fn().mockResolvedValue(tags(source.id, ['ai', 'crm'])),
      findByProductIds: vi
        .fn()
        .mockImplementation(async (ids: string[]) => storedTags.filter(row => ids.includes(row.productId))),
    };

    const result = await new AutoRecommender(reader, tagRepository).recommend({
      productId: source.id,
      excludeProductIds: ['manual'],
      limit: 10,
    });

    expect(result.map(row => row.alternativeProductId)).toEqual([
      older.id,
      overlap.id,
      'newer-no-matching-tags',
      'missing-tags',
      recentOnly.id,
    ]);
    expect(reader.findPublishedByCategoryIdAndLimit).toHaveBeenCalledExactlyOnceWith('category', 30);
    expect(reader.findTopNSortByPublishedAtDesc).toHaveBeenCalledExactlyOnceWith(50);
    expect(tagRepository.findOneByProductId).toHaveBeenCalledExactlyOnceWith(source.id);
    expect(tagRepository.findByProductIds).toHaveBeenCalledExactlyOnceWith([
      'newer-no-matching-tags',
      older.id,
      overlap.id,
      'missing-tags',
      recentOnly.id,
      ...noise.map(row => row.id),
    ]);
  });

  it('keeps category ordering without loading recent products when the source has no tags', async () => {
    const reader = {
      findPublishedOneById: vi.fn().mockResolvedValue(product('source', ['category'])),
      findPublishedByCategoryIdAndLimit: vi
        .fn()
        .mockResolvedValue([product('older', [], '2020-01-01'), product('first-tie'), product('second-tie')]),
      findTopNSortByPublishedAtDesc: vi.fn(),
    };
    const tagRepository = {
      findOneByProductId: vi.fn().mockResolvedValue(null),
      findByProductIds: vi.fn(),
    };

    const result = await new AutoRecommender(reader, tagRepository).recommend({
      productId: 'source',
    });

    expect(result.map(row => row.alternativeProductId)).toEqual(['first-tie', 'second-tie', 'older']);
    expect(reader.findTopNSortByPublishedAtDesc).not.toHaveBeenCalled();
    expect(tagRepository.findByProductIds).not.toHaveBeenCalled();
  });
});
