import { Inject, Service } from 'typedi';
import type { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import type { RankedProductVoteRepository } from '../repositories/RankedProductVoteRepository';
import { RankedProductVoteRepositoryToken } from '../repositories/RankedProductVoteRepository';
import { RankingCache } from '../services/RankingCache';
import { RankingService } from '../services/RankingService';
import { SystemClock } from '../services/SystemClock';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

const INITIAL_RANKING_CANDIDATE_MULTIPLIER = 2;
const RANKING_CANDIDATE_MULTIPLIER_STEP = 1;
const MAX_RANKING_CANDIDATE_MULTIPLIER = 5;
const MAX_RANKING_CANDIDATES = 250;
const LATEST_BUFFER_MULTIPLIER = 2;
const LATEST_BUFFER_HARD_CAP = 50;

@Service()
export class GetRankedProducts {
  constructor(
    @Inject(RankedProductVoteRepositoryToken)
    private readonly voteRepository: RankedProductVoteRepository,
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    private readonly clock: SystemClock = new SystemClock(),
    private readonly rankingService: RankingService = new RankingService(clock),
    private readonly rankingCache: RankingCache = new RankingCache(clock)
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

    const voteCandidateCount = seenProductIds.size;
    const votePublishedCount = publishedProducts.length;
    const filteredUnpublishedCount = voteCandidateCount - votePublishedCount;

    // Fetch latest-published candidates to improve recall for recent low-vote products
    const latestBufferSize = Math.min(limit * LATEST_BUFFER_MULTIPLIER, LATEST_BUFFER_HARD_CAP);
    const latestProducts = await this.productRepository.findTopNSortByPublishedAtDesc(latestBufferSize);
    const latestCandidateCount = latestProducts.length;

    // Union: add latest-published products not already in vote candidates
    const voteSourcedIds = new Set(seenProductIds);
    let addedFromLatest = 0;
    for (const product of latestProducts) {
      if (!seenProductIds.has(product.id)) {
        seenProductIds.add(product.id);
        publishedProducts.push(product);
        addedFromLatest++;
      }
    }

    const dedupedCandidateCount = publishedProducts.length;
    const voteSourcedInFinal =
      voteCandidateCount > 0 ? publishedProducts.filter(p => voteSourcedIds.has(p.id)).length : 0;
    const finalSourceRatio =
      dedupedCandidateCount > 0 ? Math.round((voteSourcedInFinal / dedupedCandidateCount) * 100) / 100 : 0;
    const droppedCandidateCount = voteCandidateCount + latestCandidateCount - dedupedCandidateCount;

    const nullPublishedAtCount = publishedProducts.filter(p => p.publishedAt == null).length;
    const warnings: string[] = [];
    if (nullPublishedAtCount > 0) {
      warnings.push('null_published_at_in_candidates');
    }
    if (filteredUnpublishedCount > 0) {
      warnings.push('unpublished_or_missing_candidates_filtered');
    }

    console.info({
      event: 'ranking.candidate_quality_checked',
      voteCandidateCount,
      latestCandidateCount,
      dedupedCandidateCount,
      filteredUnpublishedCount,
      finalSourceRatio,
      droppedCandidateCount,
      warnings,
    });

    if (publishedProducts.length === 0) {
      return [];
    }

    return publishedProducts
      .sort((a, b) => {
        const scoreDiff = this.score(b, voteCountByProductId) - this.score(a, voteCountByProductId);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        const now = this.clock.now();
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
    const now = this.clock.now();
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
