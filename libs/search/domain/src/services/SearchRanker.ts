import { RankingService } from '@darun/products-domain';
import { Service } from 'typedi';
import type { SearchableProduct } from '../entities/SearchableProduct';

const SEARCH_SCORE_WEIGHT = 0.7;
const RANKING_SCORE_WEIGHT = 0.3;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export const SEARCH_SYNONYM_MAP = {
  노트북: ['laptop', '랩톱'],
  마우스: ['mouse', '포인팅 디바이스'],
  키보드: ['keyboard', '자판'],
  모니터: ['monitor', 'display', '디스플레이'],
} satisfies Record<string, readonly string[]>;

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
    return [...products].sort((a, b) => this.finalScore(b) - this.finalScore(a));
  }

  private finalScore(product: RankableProduct): number {
    const searchScore = product.searchScore ?? 0;
    const rankingScore = this.rankingScore(product);

    return searchScore * SEARCH_SCORE_WEIGHT + rankingScore * RANKING_SCORE_WEIGHT;
  }

  private rankingScore(product: RankableProduct): number {
    const createdAt = product.createdAt ?? product.publishedAt ?? this.getNow();
    const ageHours = Math.max(0, this.getNow().getTime() - createdAt.getTime()) / MILLISECONDS_PER_HOUR;

    return this.rankingService.calculateScore(product.votes ?? 0, ageHours, createdAt);
  }
}
