import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { GetPublishedProductsForSitemap } from '../usecases/GetPublishedProductsForSitemap';

function makeProduct(id: string, name: string): Product {
  return new Product({
    id,
    name,
    slug: id,
    summary: `Summary ${name}`,
    logoUrl: `https://example.com/${id}.png`,
    publishedAt: new Date(),
  });
}

async function runWithProducts(ids: string[], params: { limit: number; cursor?: string }) {
  const mockProducts = ids.map(id => makeProduct(id, `Product ${id}`));
  const findPublishedByAfterIdAndLimit = vi.fn().mockResolvedValue(mockProducts);
  const useCase = new GetPublishedProductsForSitemap({
    findPublishedByAfterIdAndLimit,
  } as unknown as ProductRepository);
  const result = await useCase.execute(params);
  return { result, findPublishedByAfterIdAndLimit };
}

describe('GetPublishedProductsForSitemap', () => {
  it('fetches published products with cursor pagination', async () => {
    const { result, findPublishedByAfterIdAndLimit } = await runWithProducts(['p3', 'p2', 'p1'], {
      limit: 2,
      cursor: 'p3',
    });

    // Over-fetches by one to detect whether another page exists.
    expect(findPublishedByAfterIdAndLimit).toHaveBeenCalledWith(3, 'p3');
    expect(result.products).toHaveLength(2);
    expect(result.nextCursor).toBe('p2');
  });

  it('sets nextCursor to undefined when the final page is exactly full', async () => {
    const { result } = await runWithProducts(['p2', 'p1'], { limit: 2 });

    expect(result.products).toHaveLength(2);
    expect(result.nextCursor).toBeUndefined();
  });

  it('sets nextCursor to undefined when returned products count is less than limit', async () => {
    const { result } = await runWithProducts(['p1'], { limit: 5 });

    expect(result.products).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });
});
