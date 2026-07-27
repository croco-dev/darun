import { RankingService, SystemClock } from '@darun/products-domain';
import { Service } from 'typedi';
import type { SearchableProduct } from '../entities/SearchableProduct';
import { SEARCH_SCORE_WEIGHT, RANKING_SCORE_WEIGHT } from './SearchRankingPolicy';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

type RankableProduct = SearchableProduct & {
  readonly searchScore?: number;
  readonly votes?: number;
  readonly createdAt?: Date;
  readonly publishedAt?: Date;
};

type RerankQualitySummary = {
  event: 'search.rerank_quality_checked';
  rerankCandidateCount: number;
  searchMin: number;
  searchMax: number;
  searchRange: number;
  searchZeroRange: boolean;
  rankingMin: number;
  rankingMax: number;
  rankingRange: number;
  rankingZeroRange: boolean;
  topResultSearchScore: number;
  topResultRankingScore: number;
  topResultCombinedScore: number;
};

@Service()
export class SearchRanker {
  constructor(
    private readonly clock: SystemClock = new SystemClock(),
    private readonly rankingService: RankingService = new RankingService(clock)
  ) {}

  rank(products: readonly RankableProduct[]): SearchableProduct[] {
    if (products.length === 0) {
      return [];
    }

    const start = performance.now();

    const searchScores = products.map(p => {
      const raw = p.searchScore ?? 0;
      return Number.isFinite(raw) ? Math.max(0, raw) : 0;
    });
    const rankingScores = products.map(p => this.rankingScore(p));

    const searchStats = this.minMaxStats(searchScores);
    const rankingStats = this.minMaxStats(rankingScores);

    const normalizedSearchScores = this.normalizeWithStats(searchScores, searchStats);
    const normalizedRankingScores = this.normalizeWithStats(rankingScores, rankingStats);

    const result = this.sortByCombinedScore(products, normalizedSearchScores, normalizedRankingScores);

    const rerankLatencyMs = performance.now() - start;
    console.info({
      event: 'search.reranked',
      rerankCandidateCount: products.length,
      rerankLatencyMs: Math.round(rerankLatencyMs),
    });
    this.logQualitySummary({
      rerankCandidateCount: products.length,
      searchStats,
      rankingStats,
      topResult: result[0] ? products.indexOf(result[0]) : 0,
      normalizedSearchScores,
      normalizedRankingScores,
    });

    return result;
  }

  private minMaxStats(values: number[]): { min: number; max: number; range: number; zeroRange: boolean } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    return { min, max, range, zeroRange: range === 0 };
  }

  private normalizeWithStats(values: number[], stats: { min: number; range: number; zeroRange: boolean }): number[] {
    if (stats.zeroRange) {
      return values.map(() => 0.5);
    }

    return values.map(v => (v - stats.min) / stats.range);
  }

  private combinedScore(normalizedSearch: number, normalizedRanking: number): number {
    return normalizedSearch * SEARCH_SCORE_WEIGHT + normalizedRanking * RANKING_SCORE_WEIGHT;
  }

  private logQualitySummary(payload: {
    rerankCandidateCount: number;
    searchStats: { min: number; max: number; range: number; zeroRange: boolean };
    rankingStats: { min: number; max: number; range: number; zeroRange: boolean };
    topResult: number;
    normalizedSearchScores: number[];
    normalizedRankingScores: number[];
  }): void {
    const topResultIndex = payload.topResult;
    const summary: RerankQualitySummary = {
      event: 'search.rerank_quality_checked',
      rerankCandidateCount: payload.rerankCandidateCount,
      searchMin: payload.searchStats.min,
      searchMax: payload.searchStats.max,
      searchRange: payload.searchStats.range,
      searchZeroRange: payload.searchStats.zeroRange,
      rankingMin: payload.rankingStats.min,
      rankingMax: payload.rankingStats.max,
      rankingRange: payload.rankingStats.range,
      rankingZeroRange: payload.rankingStats.zeroRange,
      topResultSearchScore: payload.normalizedSearchScores[topResultIndex],
      topResultRankingScore: payload.normalizedRankingScores[topResultIndex],
      topResultCombinedScore: this.combinedScore(
        payload.normalizedSearchScores[topResultIndex],
        payload.normalizedRankingScores[topResultIndex]
      ),
    };

    console.info(summary);
  }

  private rankingScore(product: RankableProduct): number {
    const createdAt = product.publishedAt ?? product.createdAt ?? this.clock.now();
    const ageHours = Math.max(0, this.clock.now().getTime() - createdAt.getTime()) / MILLISECONDS_PER_HOUR;

    return this.rankingService.calculateScore(product.votes ?? 0, ageHours, createdAt);
  }

  private sortByCombinedScore(
    products: readonly RankableProduct[],
    normalizedSearchScores: number[],
    normalizedRankingScores: number[]
  ): SearchableProduct[] {
    return [...products]
      .map((product, i) => ({
        product,
        normalizedSearch: normalizedSearchScores[i],
        combinedScore: this.combinedScore(normalizedSearchScores[i], normalizedRankingScores[i]),
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .map(({ product }) => product);
  }
}
