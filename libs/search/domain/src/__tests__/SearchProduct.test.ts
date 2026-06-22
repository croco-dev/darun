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

  it('returns empty array when limit is explicitly 0', async () => {
    const products = [createProduct('p1')];
    const repository = createRepository(products);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 0 });

    expect(repository.searchProduct).toHaveBeenCalledWith('product', 0, 0);
    expect(result).toEqual([]);
  });

  it('returns single candidate unchanged when min-max range is 0', async () => {
    const product = new SearchableProduct({
      id: 'single',
      slug: 'single',
      name: 'Single',
      summary: 'Only one result',
      searchScore: 5,
      createdAt: NOW,
      votes: 10,
    });
    const repository = createRepository([product]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 1 });

    expect(result).toEqual([product]);
  });

  it('treats undefined searchScore as 0 for normalization', async () => {
    const a = new SearchableProduct({
      id: 'a',
      slug: 'a',
      name: 'A',
      summary: 'A',
      searchScore: 0,
      createdAt: NOW,
      votes: 0,
    });
    const b = new SearchableProduct({
      id: 'b',
      slug: 'b',
      name: 'B',
      summary: 'B',
      createdAt: NOW,
      votes: 100,
    });
    const repository = createRepository([a, b]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 2 });

    // searchScores = [0, undefined] → both 0 after ?? 0 → range=0 → both 0.5 normalized
    // b has higher ranking score → b first
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('a');
  });

  it('preserves input order when combined scores are completely tied', async () => {
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
      votes: 0,
    });

    // Input order: b then a
    const repository1 = createRepository([b, a]);
    const uc1 = createUseCase(repository1);
    const result1 = await uc1.execute({ query: 'product', limit: 2 });

    expect(result1[0].id).toBe('b');
    expect(result1[1].id).toBe('a');

    // Input order: a then b
    const repository2 = createRepository([a, b]);
    const uc2 = createUseCase(repository2);
    const result2 = await uc2.execute({ query: 'product', limit: 2 });

    expect(result2[0].id).toBe('a');
    expect(result2[1].id).toBe('b');
  });

  it('treats future publishedAt the same as publishedAt=NOW for ranking', async () => {
    const a = new SearchableProduct({
      id: 'a',
      slug: 'a',
      name: 'A',
      summary: 'A',
      searchScore: 5,
      createdAt: NOW,
      votes: 10,
      publishedAt: NOW,
    });
    const b = new SearchableProduct({
      id: 'b',
      slug: 'b',
      name: 'B',
      summary: 'B',
      searchScore: 5,
      createdAt: NOW,
      votes: 10,
      publishedAt: new Date(NOW.getTime() + 4 * 24 * 60 * 60 * 1000),
    });
    const repository = createRepository([a, b]);
    const useCase = createUseCase(repository);

    const result = await useCase.execute({ query: 'product', limit: 2 });

    // Both get ageHours=0 and same boost → identical combined scores → input order preserved
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  describe('golden rerank fixtures', () => {
    it('relevance-wins fixture produces exact order with exact combined scores', async () => {
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
      const repository = createRepository([b, a]);
      const useCase = createUseCase(repository);

      const result = await useCase.execute({ query: 'product', limit: 2 });

      expect(result[0].id).toBe('a');
      expect(result[1].id).toBe('b');
    });

    it('zero-range search fallback (0.5) lets popularity win with exact order', async () => {
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

      expect(result[0].id).toBe('b');
      expect(result[1].id).toBe('a');
    });

    it('logs rerank quality summary with exact event name and range fields', async () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
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
      const repository = createRepository([b, a]);
      const useCase = createUseCase(repository);

      await useCase.execute({ query: 'product', limit: 2 });

      const qualityLog = infoSpy.mock.calls
        .map(call => call[0])
        .find(log => log.event === 'search.rerank_quality_checked');
      expect(qualityLog).toBeDefined();
      expect(qualityLog.event).toBe('search.rerank_quality_checked');
      expect(qualityLog.rerankCandidateCount).toBe(2);
      expect(qualityLog.searchMin).toBe(1);
      expect(qualityLog.searchMax).toBe(10);
      expect(qualityLog.searchRange).toBe(9);
      expect(qualityLog.searchZeroRange).toBe(false);
      expect(qualityLog.rankingMin).toBeGreaterThanOrEqual(0);
      expect(qualityLog.rankingMax).toBeGreaterThanOrEqual(0);
      expect(qualityLog.rankingRange).toBeGreaterThanOrEqual(0);
      expect(qualityLog.rankingZeroRange).toBe(false);
      expect(qualityLog.topResultSearchScore).toBe(1);
      expect(qualityLog.topResultRankingScore).toBeGreaterThanOrEqual(0);
      expect(qualityLog.topResultCombinedScore).toBeGreaterThan(0);

      infoSpy.mockRestore();
    });

    it('locks the rerank quality log name and required payload fields', async () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
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
        searchScore: 1,
        createdAt: NOW,
        votes: 100,
      });
      const repository = createRepository([a, b]);
      const useCase = createUseCase(repository);

      await useCase.execute({ query: 'product', limit: 2 });

      const qualityLog = infoSpy.mock.calls
        .map(call => call[0])
        .find(log => log.event === 'search.rerank_quality_checked');
      expect(qualityLog).toBeDefined();
      expect(qualityLog.event).toBe('search.rerank_quality_checked');
      expect(qualityLog).toHaveProperty('rerankCandidateCount');
      expect(qualityLog).toHaveProperty('searchMin');
      expect(qualityLog).toHaveProperty('searchMax');
      expect(qualityLog).toHaveProperty('searchRange');
      expect(qualityLog).toHaveProperty('searchZeroRange');
      expect(qualityLog).toHaveProperty('rankingMin');
      expect(qualityLog).toHaveProperty('rankingMax');
      expect(qualityLog).toHaveProperty('rankingRange');
      expect(qualityLog).toHaveProperty('rankingZeroRange');
      expect(qualityLog).toHaveProperty('topResultSearchScore');
      expect(qualityLog).toHaveProperty('topResultRankingScore');
      expect(qualityLog).toHaveProperty('topResultCombinedScore');

      infoSpy.mockRestore();
    });

    it('logs zero-range flag in rerank quality summary when all search scores are identical', async () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
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

      await useCase.execute({ query: 'product', limit: 2 });

      const qualityLog = infoSpy.mock.calls
        .map(call => call[0])
        .find(log => log.event === 'search.rerank_quality_checked');
      expect(qualityLog).toBeDefined();
      expect(qualityLog.searchMin).toBe(5);
      expect(qualityLog.searchMax).toBe(5);
      expect(qualityLog.searchRange).toBe(0);
      expect(qualityLog.searchZeroRange).toBe(true);
      expect(qualityLog.topResultSearchScore).toBe(0.5);

      infoSpy.mockRestore();
    });

    it('popularity wins only when search score is in zero-range', async () => {
      const a = new SearchableProduct({
        id: 'a',
        slug: 'a',
        name: 'A',
        summary: 'A',
        searchScore: 5,
        createdAt: NOW,
        votes: 100000,
      });
      const b = new SearchableProduct({
        id: 'b',
        slug: 'b',
        name: 'B',
        summary: 'B',
        searchScore: 5.0000001,
        createdAt: NOW,
        votes: 0,
      });
      const repository = createRepository([a, b]);
      const useCase = createUseCase(repository);

      const result = await useCase.execute({ query: 'product', limit: 2 });

      expect(result[0].id).toBe('b');
      expect(result[1].id).toBe('a');
    });

    it('three-way fixture produces exact order', async () => {
      const highRelevance = new SearchableProduct({
        id: 'high-relevance',
        slug: 'high-relevance',
        name: 'High Relevance',
        summary: 'Exactly matches query',
        searchScore: 10,
        createdAt: NOW,
        votes: 0,
      });
      const mediumPopularity = new SearchableProduct({
        id: 'medium-popularity',
        slug: 'medium-popularity',
        name: 'Medium Popularity',
        summary: 'Somewhat popular',
        searchScore: 7,
        createdAt: NOW,
        votes: 50,
      });
      const lowBoth = new SearchableProduct({
        id: 'low-both',
        slug: 'low-both',
        name: 'Low Both',
        summary: 'Neither relevant nor popular',
        searchScore: 2,
        createdAt: NOW,
        votes: 1,
      });
      const repository = createRepository([lowBoth, mediumPopularity, highRelevance]);
      const useCase = createUseCase(repository);

      const result = await useCase.execute({ query: 'product', limit: 3 });

      expect(result.map(p => p.id)).toEqual(['medium-popularity', 'high-relevance', 'low-both']);
    });

    it('zero-vote and zero-search all tie preserves input order', async () => {
      const a = new SearchableProduct({
        id: 'a',
        slug: 'a',
        name: 'A',
        summary: 'A',
        searchScore: 0,
        createdAt: NOW,
        votes: 0,
      });
      const b = new SearchableProduct({
        id: 'b',
        slug: 'b',
        name: 'B',
        summary: 'B',
        searchScore: 0,
        createdAt: NOW,
        votes: 0,
      });
      const repository = createRepository([b, a]);
      const useCase = createUseCase(repository);

      const result = await useCase.execute({ query: 'product', limit: 2 });

      expect(result[0].id).toBe('b');
      expect(result[1].id).toBe('a');
    });
  });

  describe('input defense', () => {
    it('handles NaN searchScore by treating it as 0', async () => {
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
        searchScore: NaN,
        createdAt: NOW,
        votes: 100,
      });
      const repository = createRepository([b, a]);
      const useCase = createUseCase(repository);

      const result = await useCase.execute({ query: 'product', limit: 2 });

      // NaN should be treated as 0 for min-max normalization.
      // a (searchScore=10, relevance=1) should beat b (searchScore=0, relevance=0).
      expect(result[0].id).toBe('a');
      expect(result[1].id).toBe('b');
    });

    it('clamps negative searchScore to 0 for normalization', async () => {
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
        searchScore: 2,
        createdAt: NOW,
        votes: 100,
      });
      const c = new SearchableProduct({
        id: 'c',
        slug: 'c',
        name: 'C',
        summary: 'C',
        searchScore: -10,
        createdAt: NOW,
        votes: 0,
      });
      const repository = createRepository([c, b, a]);
      const useCase = createUseCase(repository);

      const result = await useCase.execute({ query: 'product', limit: 3 });

      // Negative should be clamped to 0: searchScores=[5,2,0], norm: a=1, b=0.4, c=0
      expect(result[0].id).toBe('a');
    });
  });

  const createRepository = (products: SearchableProduct[]): SearchableProductRepository => ({
    index: vi.fn<SearchableProductRepository['index']>().mockResolvedValue(true),
    searchProduct: vi.fn<SearchableProductRepository['searchProduct']>().mockResolvedValue(products),
  });
});
