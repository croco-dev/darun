import 'reflect-metadata';
import { Product } from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { AutoRecommender } from './AutoRecommender';

const product = (id: string, categoryIds: string[] = []) =>
  new Product({
    id,
    name: id,
    slug: id,
    summary: '',
    logoUrl: '',
    categoryIds,
    publishedAt: new Date('2026-01-01'),
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
