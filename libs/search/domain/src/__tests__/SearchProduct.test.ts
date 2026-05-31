import { describe, expect, it, vi } from 'vitest';
import { SearchableProduct } from '../entities/SearchableProduct';
import type { SearchableProductRepository } from '../repositories/SearchableProductRepository';
import { SearchRanker } from '../services/SearchRanker';
import { SynonymExpander } from '../services/SynonymExpander';
import { SearchProduct } from '../usecases/SearchProduct';

const NOW = new Date('2026-01-01T12:00:00.000Z');

describe('SearchProduct', () => {
  const createProduct = (id: string, searchScore?: number) =>
    new SearchableProduct({
      id,
      slug: `product-${id}`,
      name: `Product ${id}`,
      summary: `Summary of ${id}`,
      searchScore,
    });

  const createUseCase = (repository: SearchableProductRepository) =>
    new SearchProduct(repository, new SynonymExpander(), new SearchRanker(() => NOW));

  it('searches with the normalized query when limit is omitted', async () => {
    const products = [createProduct('p1')];
    const repository = createRepository(products);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: ' Product ' });

    expect(repository.searchProduct).toHaveBeenCalledWith('product', undefined);
    expect(result).toEqual(products);
  });

  it('passes the requested limit to the repository', async () => {
    const products = [createProduct('p1'), createProduct('p2')];
    const repository = createRepository(products);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'Product', limit: 2 });

    expect(repository.searchProduct).toHaveBeenCalledWith('product', 2);
    expect(result).toEqual(products);
  });

  it('returns an empty result from the repository', async () => {
    const repository = createRepository([]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'missing', limit: 3 });

    expect(repository.searchProduct).toHaveBeenCalledWith('missing', 3);
    expect(result).toEqual([]);
  });

  it('expands Korean and English query tokens with static synonyms', async () => {
    const repository = createRepository([]);
    const useCase = createUseCase(repository);

    await useCase.execute({ query: '노트북 Mouse', limit: 5 });

    expect(repository.searchProduct).toHaveBeenCalledWith(
      '노트북 laptop 랩톱 mouse 마우스 포인팅 디바이스',
      5
    );
  });

  it('combines Atlas relevance and ranking score before returning results', async () => {
    const relevantOnly = createProduct('relevant', 5);
    const popular = createProduct('popular', 2);
    const repository = createRepository([relevantOnly, popular]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 2 });

    expect(result).toEqual([relevantOnly, popular]);
  });

  const createRepository = (products: SearchableProduct[]): SearchableProductRepository => ({
    index: vi.fn<SearchableProductRepository['index']>().mockResolvedValue(true),
    searchProduct: vi.fn<SearchableProductRepository['searchProduct']>().mockResolvedValue(products),
  });
});
