import { describe, expect, it, vi } from 'vitest';
import { SearchableProduct } from '../entities/SearchableProduct';
import type { SearchableProductRepository } from '../repositories/SearchableProductRepository';
import { SearchProduct } from '../usecases/SearchProduct';

describe('SearchProduct', () => {
  const createProduct = (id: string) =>
    new SearchableProduct({
      id,
      slug: `product-${id}`,
      name: `Product ${id}`,
      summary: `Summary of ${id}`,
    });

  const createRepository = (products: SearchableProduct[]): SearchableProductRepository => ({
    index: vi.fn<SearchableProductRepository['index']>().mockResolvedValue(true),
    searchProduct: vi.fn<SearchableProductRepository['searchProduct']>().mockResolvedValue(products),
  });

  it('searches with the normalized query when limit is omitted', async () => {
    const products = [createProduct('p1')];
    const repository = createRepository(products);
    const useCase = new SearchProduct(repository);

    const result = await useCase.execute({ query: ' Product ' });

    expect(repository.searchProduct).toHaveBeenCalledWith('product', undefined);
    expect(result).toBe(products);
  });

  it('passes the requested limit to the repository', async () => {
    const products = [createProduct('p1'), createProduct('p2')];
    const repository = createRepository(products);
    const useCase = new SearchProduct(repository);

    const result = await useCase.execute({ query: 'Product', limit: 2 });

    expect(repository.searchProduct).toHaveBeenCalledWith('product', 2);
    expect(result).toBe(products);
  });

  it('returns an empty result from the repository', async () => {
    const repository = createRepository([]);
    const useCase = new SearchProduct(repository);

    const result = await useCase.execute({ query: 'missing', limit: 3 });

    expect(repository.searchProduct).toHaveBeenCalledWith('missing', 3);
    expect(result).toEqual([]);
  });
});
