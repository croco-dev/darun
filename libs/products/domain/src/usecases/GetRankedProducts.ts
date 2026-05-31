import { Inject, Service } from 'typedi';
import type { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import type { RankedProductVoteRepository } from '../repositories/RankedProductVoteRepository';
import { RankedProductVoteRepositoryToken } from '../repositories/RankedProductVoteRepository';
import { RankingCache } from '../services/RankingCache';
import { RankingService } from '../services/RankingService';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

@Service()
export class GetRankedProducts {
  constructor(
    @Inject(RankedProductVoteRepositoryToken)
    private readonly voteRepository: RankedProductVoteRepository,
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    private readonly getNow: () => Date = () => new Date(),
    private readonly rankingService: RankingService = new RankingService(getNow),
    private readonly rankingCache: RankingCache = new RankingCache()
  ) {}

  async execute({ limit }: { limit: number }): Promise<Product[]> {
    let results = await this.fetchWithMultiplier(limit, 2);
    if (results.length < limit) {
      results = await this.fetchWithMultiplier(limit, 3);
    }

    return results.slice(0, limit);
  }

  private async fetchWithMultiplier(limit: number, multiplier: number): Promise<Product[]> {
    const votes = await this.voteRepository.findTopNByVoteCount(limit * multiplier);
    if (votes.length === 0) {
      return [];
    }

    const voteCountByProductId = new Map(votes.map(vote => [vote.targetId, vote.count]));
    const products = await this.productRepository.findPublishedByIds(votes.map(vote => vote.targetId));

    return products
      .filter((product): product is Product => product !== null)
      .sort((a, b) => this.score(b, voteCountByProductId) - this.score(a, voteCountByProductId));
  }

  private score(product: Product, voteCountByProductId: ReadonlyMap<string, number>): number {
    const votes = voteCountByProductId.get(product.id) ?? 0;
    const cachedScore = this.rankingCache.get(product.id);
    if (cachedScore !== undefined) {
      return cachedScore;
    }

    const now = this.getNow();
    const publishedAt = product.publishedAt ?? now;
    const ageHours = Math.max(0, now.getTime() - publishedAt.getTime()) / MILLISECONDS_PER_HOUR;
    const score = this.rankingService.calculateScore(votes, ageHours, publishedAt);

    this.rankingCache.set(product.id, score);

    return score;
  }
}
