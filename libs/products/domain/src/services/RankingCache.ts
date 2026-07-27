import { Service } from 'typedi';
import { SystemClock } from './SystemClock';

const CACHE_TTL_MILLISECONDS = 300 * 1000;

type CacheEntry = {
  readonly score: number;
  readonly cachedAt: number;
};

@Service()
export class RankingCache {
  private readonly scores = new Map<string, CacheEntry>();

  constructor(private readonly clock: SystemClock = new SystemClock()) {}

  get(productId: string, voteCount: number, ageBucket: number): number | undefined {
    const key = this.buildKey(productId, voteCount, ageBucket);
    const entry = this.scores.get(key);
    if (!entry) {
      console.info({
        event: 'ranking.cache_access',
        cacheStatus: 'miss',
      });
      return undefined;
    }

    if (this.clock.nowMilliseconds() - entry.cachedAt > CACHE_TTL_MILLISECONDS) {
      this.scores.delete(key);
      console.info({
        event: 'ranking.cache_access',
        cacheStatus: 'invalidated',
        cacheInvalidationReason: 'ttl_expired',
      });
      return undefined;
    }

    console.info({
      event: 'ranking.cache_access',
      cacheStatus: 'hit',
    });

    return entry.score;
  }

  set(productId: string, voteCount: number, ageBucket: number, score: number): void {
    const key = this.buildKey(productId, voteCount, ageBucket);
    this.scores.set(key, { score, cachedAt: this.clock.nowMilliseconds() });
  }

  invalidate(productId: string): void {
    const prefix = `${productId}:`;
    for (const key of this.scores.keys()) {
      if (key.startsWith(prefix)) {
        this.scores.delete(key);
      }
    }
  }

  private buildKey(productId: string, voteCount: number, ageBucket: number): string {
    return `${productId}:${voteCount}:${ageBucket}`;
  }
}
