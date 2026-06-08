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

    expect(repository.searchProduct).toHaveBeenCalledWith('product', undefined, undefined);
    expect(result).toEqual(products);
  });

  it('passes the requested limit and a wider candidate limit to the repository', async () => {
    const products = [createProduct('p1'), createProduct('p2')];
    const repository = createRepository(products);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'Product', limit: 2 });

    expect(repository.searchProduct).toHaveBeenCalledWith('product', 2, 6);
    expect(result).toEqual(products);
  });

  it('returns an empty result from the repository', async () => {
    const repository = createRepository([]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'missing', limit: 3 });

    expect(repository.searchProduct).toHaveBeenCalledWith('missing', 3, 9);
    expect(result).toEqual([]);
  });

  it('expands Korean and English query tokens with static synonyms', async () => {
    const repository = createRepository([]);
    const useCase = createUseCase(repository);

    await useCase.execute({ query: '노트북 Mouse', limit: 5 });

    expect(repository.searchProduct).toHaveBeenCalledWith('노트북 laptop 랩톱 mouse 마우스 포인팅 디바이스', 5, 15);
  });

  it('combines Atlas relevance and ranking score before returning results', async () => {
    const relevantOnly = createProduct('relevant', 5);
    const popular = createProduct('popular', 2);
    const repository = createRepository([relevantOnly, popular]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 2 });

    expect(result).toEqual([relevantOnly, popular]);
  });

  it('requests a wider candidate set capped at the maximum', async () => {
    const repository = createRepository([]);
    const useCase = createUseCase(repository);

    await useCase.execute({ query: 'product', limit: 50 });

    expect(repository.searchProduct).toHaveBeenCalledWith('product', 50, 100);
  });

  it('normalizes scores so ranking magnitude does not dominate search relevance', async () => {
    const a = new SearchableProduct({
      id: 'a',
      slug: 'a',
      name: 'A',
      summary: 'A',
      searchScore: 10,
      createdAt: NOW,
      votes: 0,
    });
    const b = new SearchableProduct({
      id: 'b',
      slug: 'b',
      name: 'B',
      summary: 'B',
      searchScore: 1,
      createdAt: NOW,
      votes: 1000,
    });
    const repository = createRepository([a, b]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 2 });

    // Normalized search: a=1, b=0. Normalized ranking: a≈0, b≈1.
    // a final ≈ 0.7, b final ≈ 0.3
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  it('falls back to 0.5 when all search scores are identical (zero-range)', async () => {
    const a = new SearchableProduct({
      id: 'a',
      slug: 'a',
      name: 'A',
      summary: 'A',
      searchScore: 5,
      createdAt: NOW,
      votes: 0,
    });
    const b = new SearchableProduct({
      id: 'b',
      slug: 'b',
      name: 'B',
      summary: 'B',
      searchScore: 5,
      createdAt: NOW,
      votes: 100,
    });
    const repository = createRepository([a, b]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 2 });

    // Normalized search: both 0.5. Normalized ranking: a=0, b=1.
    // a final = 0.35, b final = 0.65
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('a');
  });

  it('falls back to 0.5 when all ranking scores are identical (zero-range)', async () => {
    const a = new SearchableProduct({
      id: 'a',
      slug: 'a',
      name: 'A',
      summary: 'A',
      searchScore: 10,
      createdAt: NOW,
      votes: 0,
    });
    const b = new SearchableProduct({
      id: 'b',
      slug: 'b',
      name: 'B',
      summary: 'B',
      searchScore: 1,
      createdAt: NOW,
      votes: 0,
    });
    const repository = createRepository([a, b]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 2 });

    // Normalized ranking: both 0.5. Normalized search: a=1, b=0.
    // a final = 0.85, b final = 0.15
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  const createRepository = (products: SearchableProduct[]): SearchableProductRepository => ({
    index: vi.fn<SearchableProductRepository['index']>().mockResolvedValue(true),
    searchProduct: vi.fn<SearchableProductRepository['searchProduct']>().mockResolvedValue(products),
  });
});
