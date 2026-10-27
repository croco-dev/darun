import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import type { ProductTag } from '../entities/ProductTag';
import { UpdateProductTag } from '../usecases/UpdateProductTag';

describe('UpdateProductTag', () => {
  it('반복된 이름은 한 번만 저장하고 대소문자와 공백은 그대로 유지한다', async () => {
    let saved: ProductTag | undefined;
    const upsert = vi.fn(async (value: ProductTag) => {
      saved = value;
      return value;
    });
    await new UpdateProductTag({
      upsert,
      findOneByProductId: vi.fn(),
      findByProductIds: vi.fn(),
    }).execute({
      productId: 'product-tags',
      tagNames: ['새 태그', 'Tag', '새 태그', 'tag', ' Tag '],
    });
    expect(saved?.productId).toBe('product-tags');
    expect(saved?.tags.map(tag => tag.name)).toEqual(['새 태그', 'Tag', 'tag', ' Tag ']);
  });
});
