// eslint-disable-next-line boundaries/element-types
import type { VoteRepository } from '@darun/voting-domain';
import { VoteRepositoryToken } from '@darun/voting-domain';
import { Inject, Service } from 'typedi';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class GetRankedProducts {
  constructor(
    @Inject(VoteRepositoryToken)
    private readonly voteRepository: VoteRepository,
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

  async execute({ limit }: { limit: number }) {
    // Try 2x first, then 3x if needed
    let results = await this.fetchWithMultiplier(limit, 2);
    if (results.length < limit) {
      results = await this.fetchWithMultiplier(limit, 3);
    }

    // Return exactly limit items (or all published if fewer)
    return results.slice(0, limit);
  }

  private async fetchWithMultiplier(limit: number, multiplier: number) {
    const votes = await this.voteRepository.findTopNByVoteCount(limit * multiplier);
    const products = await Promise.all(votes.map(vote => this.productRepository.findPublishedOneById(vote.targetId)));
    return products.filter(product => product !== null);
  }
}
