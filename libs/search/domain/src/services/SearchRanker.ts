import { RankingService } from '@darun/products-domain';
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

@Service()
export class SearchRanker {
  constructor(
    private readonly getNow: () => Date = () => new Date(),
    private readonly rankingService: RankingService = new RankingService(getNow)
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

    const normalizedSearchScores = this.minMaxNormalize(searchScores);
    const normalizedRankingScores = this.minMaxNormalize(rankingScores);

    const result = this.sortByCombinedScore(products, normalizedSearchScores, normalizedRankingScores);

    const rerankLatencyMs = performance.now() - start;
    console.info({
      event: 'search.reranked',
      rerankCandidateCount: products.length,
      rerankLatencyMs: Math.round(rerankLatencyMs),
    });

    return result;
  }

  private minMaxNormalize(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) {
      return values.map(() => 0.5);
    }

    return values.map(v => (v - min) / range);
  }

  private rankingScore(product: RankableProduct): number {
    const createdAt = product.publishedAt ?? product.createdAt ?? this.getNow();
    const ageHours = Math.max(0, this.getNow().getTime() - createdAt.getTime()) / MILLISECONDS_PER_HOUR;

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
        combinedScore:
          normalizedSearchScores[i] * SEARCH_SCORE_WEIGHT + normalizedRankingScores[i] * RANKING_SCORE_WEIGHT,
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .map(({ product }) => product);
  }
}
