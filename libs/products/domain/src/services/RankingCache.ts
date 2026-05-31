import { Service } from 'typedi';

const CACHE_TTL_MILLISECONDS = 300 * 1000;

type CacheEntry = {
  readonly score: number;
  readonly cachedAt: number;
};

@Service()
export class RankingCache {
  private readonly scores = new Map<string, CacheEntry>();

  constructor(private readonly getNow: () => number = () => Date.now()) {}

  get(productId: string): number | undefined {
    const entry = this.scores.get(productId);
    if (!entry) {
      return undefined;
    }

    if (this.getNow() - entry.cachedAt > CACHE_TTL_MILLISECONDS) {
      this.invalidate(productId);
      return undefined;
    }

    return entry.score;
  }

  set(productId: string, score: number): void {
    this.scores.set(productId, { score, cachedAt: this.getNow() });
  }

  invalidate(productId: string): void {
    this.scores.delete(productId);
  }
}
