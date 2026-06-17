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

    // a: combined=1*0.7+0*0.3=0.7, b: combined=0*0.7+1*0.3=0.3 → relevance wins
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

  it('preserves clear relevance advantage even when a popular product has much higher ranking', async () => {
    const a = new SearchableProduct({
      id: 'a',
      slug: 'a',
      name: 'High Relevance',
      summary: 'Exactly matches query',
      searchScore: 10,
      createdAt: NOW,
      votes: 0,
    });
    const b = new SearchableProduct({
      id: 'b',
      slug: 'b',
      name: 'Very Popular',
      summary: 'Popular but less relevant',
      searchScore: 1,
      createdAt: NOW,
      votes: 10000,
    });
    const repository = createRepository([b, a]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 2 });

    // a: combined=1*0.7+0*0.3=0.7, b: combined=0*0.7+1*0.3=0.3 → relevance wins
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  it('produces consistent ranking regardless of input order', async () => {
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
      searchScore: 8,
      createdAt: NOW,
      votes: 100,
    });
    const c = new SearchableProduct({
      id: 'c',
      slug: 'c',
      name: 'C',
      summary: 'C',
      searchScore: 6,
      createdAt: NOW,
      votes: 10,
    });
    const d = new SearchableProduct({
      id: 'd',
      slug: 'd',
      name: 'D',
      summary: 'D',
      searchScore: 4,
      createdAt: NOW,
      votes: 5,
    });
    const e = new SearchableProduct({
      id: 'e',
      slug: 'e',
      name: 'E',
      summary: 'E',
      searchScore: 2,
      createdAt: NOW,
      votes: 0,
    });

    const runRank = async (order: SearchableProduct[]) => {
      const repo = createRepository(order);
      const uc = createUseCase(repo);
      const r = await uc.execute({ query: 'product', limit: 5 });

      return r.map(p => p.id);
    };
    const baseline = await runRank([a, b, c, d, e]);

    const reversed = await runRank([e, d, c, b, a]);
    expect(reversed).toEqual(baseline);

    const permuted = await runRank([c, a, e, b, d]);
    expect(permuted).toEqual(baseline);
  });

  it('uses ranking as tie-breaker when normalized search scores are near-tied', async () => {
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
      searchScore: 5.05,
      createdAt: NOW,
      votes: 100,
    });
    const c = new SearchableProduct({
      id: 'c',
      slug: 'c',
      name: 'C',
      summary: 'C',
      searchScore: 5,
      createdAt: NOW,
      votes: 10,
    });
    const d = new SearchableProduct({
      id: 'd',
      slug: 'd',
      name: 'D',
      summary: 'D',
      searchScore: 1,
      createdAt: NOW,
      votes: 0,
    });
    const repository = createRepository([d, c, b, a]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 4 });

    // NormSearch: a=1, b≈0.45, c≈0.444, d=0. NormRanking: a=0, b=1, c≈0.1, d=0
    // a: combined=0.7+0=0.700, b: combined=0.315+0.3=0.615, c: combined=0.311+0.03=0.341
    // search score drives primary order; when search is close (b vs c), ranking breaks the tie
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
    expect(result[2].id).toBe('c');
    expect(result[3].id).toBe('d');
  });

  it('uses publishedAt before createdAt for ranking age calculation', async () => {
    const a = new SearchableProduct({
      id: 'a',
      slug: 'a',
      name: 'A',
      summary: 'A',
      searchScore: 5,
      publishedAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      createdAt: new Date(NOW.getTime() - 100 * 60 * 60 * 1000),
      votes: 10,
    });
    const b = new SearchableProduct({
      id: 'b',
      slug: 'b',
      name: 'B',
      summary: 'B',
      searchScore: 5,
      publishedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
      createdAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      votes: 10,
    });
    const repository = createRepository([a, b]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 2 });

    // Both have same searchScore(5) → zero-range → normalized both 0.5 → near-tie → combined score
    // a: publishedAt=2h ago → ageHours=2, new-boost → higher rankingScore
    // b: publishedAt=48h ago → ageHours=48, no boost → lower rankingScore
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  it('keeps clear lexical relevance ahead of log-scaled popularity', async () => {
    const a = new SearchableProduct({
      id: 'a',
      slug: 'a',
      name: 'A',
      summary: 'A',
      searchScore: 0.95,
      publishedAt: new Date(NOW.getTime() - 24 * 60 * 60 * 1000),
      votes: 5,
    });
    const b = new SearchableProduct({
      id: 'b',
      slug: 'b',
      name: 'B',
      summary: 'B',
      searchScore: 0.2,
      publishedAt: new Date(NOW.getTime() - 24 * 60 * 60 * 1000),
      votes: 1000,
    });
    const repository = createRepository([b, a]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 2 });

    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  const createRepository = (products: SearchableProduct[]): SearchableProductRepository => ({
    index: vi.fn<SearchableProductRepository['index']>().mockResolvedValue(true),
    searchProduct: vi.fn<SearchableProductRepository['searchProduct']>().mockResolvedValue(products),
  });
});
