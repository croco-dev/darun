import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import { GetPublishedProductsForSitemap } from '../usecases/GetPublishedProductsForSitemap';
import { createMockRepository } from './productRepositoryMock';

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
  const repository = {
    ...createMockRepository(),
    findPublishedByAfterIdAndLimit,
  };
  const useCase = new GetPublishedProductsForSitemap(repository);
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
    expect(findPublishedByAfterIdAndLimit).toHaveBeenCalledWith(3, 'p3', {
      lowerBoundId: undefined,
      upperBoundId: undefined,
    });
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
  it('passes inclusive bounds alongside the exclusive page cursor', async () => {
    const repository = createMockRepository();
    const read = vi.spyOn(repository, 'findPublishedByAfterIdAndLimit').mockResolvedValue([]);
    await new GetPublishedProductsForSitemap(repository).execute({
      limit: 100,
      cursor: 'p5',
      lowerBoundId: 'p2',
      upperBoundId: 'p8',
    });
    expect(read).toHaveBeenCalledWith(101, 'p5', {
      lowerBoundId: 'p2',
      upperBoundId: 'p8',
    });
  });

  it.each([
    { lowerBoundId: '' },
    { upperBoundId: '<tag>' },
    { lowerBoundId: 'a'.repeat(27) },
    { lowerBoundId: 'p9', upperBoundId: 'p2' },
  ])('rejects invalid bounds before reading: %j', async bounds => {
    const repository = createMockRepository();
    const read = vi.spyOn(repository, 'findPublishedByAfterIdAndLimit');
    await expect(new GetPublishedProductsForSitemap(repository).execute(bounds)).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  });
});
