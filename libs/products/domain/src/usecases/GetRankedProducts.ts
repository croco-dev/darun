import { Inject, Service } from 'typedi';
import type { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import type { RankedProductVoteRepository } from '../repositories/RankedProductVoteRepository';
import { RankedProductVoteRepositoryToken } from '../repositories/RankedProductVoteRepository';

const RANKING_GRAVITY = 0.6;
const RANKING_AGE_OFFSET_HOURS = 2;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

@Service()
export class GetRankedProducts {
  constructor(
    @Inject(RankedProductVoteRepositoryToken)
    private readonly voteRepository: RankedProductVoteRepository,
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    private readonly getNow: () => Date = () => new Date()
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
    const now = this.getNow();
    const publishedAt = product.publishedAt ?? now;
    const ageHours = Math.max(0, now.getTime() - publishedAt.getTime()) / MILLISECONDS_PER_HOUR;

    return votes / Math.pow(ageHours + RANKING_AGE_OFFSET_HOURS, RANKING_GRAVITY);
  }
}
