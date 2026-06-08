import { Inject, Service } from 'typedi';
import type { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import type { RankedProductVoteRepository } from '../repositories/RankedProductVoteRepository';
import { RankedProductVoteRepositoryToken } from '../repositories/RankedProductVoteRepository';
import { RankingCache } from '../services/RankingCache';
import { RankingService } from '../services/RankingService';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

const INITIAL_RANKING_CANDIDATE_MULTIPLIER = 2;
const RANKING_CANDIDATE_MULTIPLIER_STEP = 1;
const MAX_RANKING_CANDIDATE_MULTIPLIER = 5;
const MAX_RANKING_CANDIDATES = 250;

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
    const voteCountByProductId = new Map<string, number>();
    const seenProductIds = new Set<string>();
    const publishedProducts: Product[] = [];

    let multiplier = INITIAL_RANKING_CANDIDATE_MULTIPLIER;

    while (multiplier <= MAX_RANKING_CANDIDATE_MULTIPLIER) {
      const fetchSize = Math.min(limit * multiplier, MAX_RANKING_CANDIDATES);

      const votes = await this.voteRepository.findTopNByVoteCount(fetchSize);
      if (votes.length === 0) {
        break;
      }

      for (const vote of votes) {
        voteCountByProductId.set(vote.targetId, vote.count);
      }

      const newIds = votes.map(vote => vote.targetId).filter(id => !seenProductIds.has(id));
      if (newIds.length === 0) {
        break;
      }

      const products = await this.productRepository.findPublishedByIds(newIds);

      for (let i = 0; i < products.length; i++) {
        seenProductIds.add(newIds[i]);
        const product = products[i];
        if (product !== null) {
          publishedProducts.push(product);
        }
      }

      if (publishedProducts.length >= limit) {
        break;
      }

      if (votes.length < fetchSize) {
        break;
      }

      const nextMultiplier = multiplier + RANKING_CANDIDATE_MULTIPLIER_STEP;
      const nextFetchSize = Math.min(limit * nextMultiplier, MAX_RANKING_CANDIDATES);
      if (nextFetchSize <= fetchSize) {
        break;
      }

      multiplier = nextMultiplier;
    }

    if (publishedProducts.length === 0) {
      return [];
    }

    const candidateCount = seenProductIds.size;
    const publishedCandidateCount = publishedProducts.length;
    const filteredUnpublishedCount = candidateCount - publishedCandidateCount;
    console.info({
      event: 'ranking.candidates_collected',
      candidateCount,
      publishedCandidateCount,
      filteredUnpublishedCount,
    });

    return publishedProducts
      .sort((a, b) => {
        const scoreDiff = this.score(b, voteCountByProductId) - this.score(a, voteCountByProductId);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        const now = this.getNow();
        const aPublished = a.publishedAt ?? now;
        const bPublished = b.publishedAt ?? now;
        const publishedDiff = bPublished.getTime() - aPublished.getTime();
        if (publishedDiff !== 0) {
          return publishedDiff;
        }

        return a.id.localeCompare(b.id);
      })
      .slice(0, limit);
  }

  private score(product: Product, voteCountByProductId: ReadonlyMap<string, number>): number {
    const votes = voteCountByProductId.get(product.id) ?? 0;
    const now = this.getNow();
    const publishedAt = product.publishedAt ?? now;
    const ageHours = Math.max(0, now.getTime() - publishedAt.getTime()) / MILLISECONDS_PER_HOUR;
    const ageBucket = Math.floor(ageHours * 12);

    const cachedScore = this.rankingCache.get(product.id, votes, ageBucket);
    if (cachedScore !== undefined) {
      return cachedScore;
    }

    const score = this.rankingService.calculateScore(votes, ageHours, publishedAt);
    this.rankingCache.set(product.id, votes, ageBucket, score);

    return score;
  }
}
