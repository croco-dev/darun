import { Service } from 'typedi';
import { SystemClock } from './SystemClock';

const CACHE_TTL_MILLISECONDS = 300 * 1000;

export const MAX_RANKING_CACHE_ENTRIES = 1000;

type CacheEntry = {
  readonly score: number;
  readonly cachedAt: number;
};

function isLogEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

@Service()
export class RankingCache {
  private readonly scores = new Map<string, CacheEntry>();

  constructor(private readonly clock: SystemClock = new SystemClock()) {}

  get(productId: string, voteCount: number, ageBucket: number): number | undefined {
    const key = this.buildKey(productId, voteCount, ageBucket);
    const entry = this.scores.get(key);
    if (!entry) {
      this.logCacheAccess('miss');
      return undefined;
    }

    if (this.clock.nowMilliseconds() - entry.cachedAt > CACHE_TTL_MILLISECONDS) {
      this.scores.delete(key);
      this.logCacheAccess('invalidated', 'ttl_expired');
      return undefined;
    }

    this.logCacheAccess('hit');

    return entry.score;
  }

  set(productId: string, voteCount: number, ageBucket: number, score: number): void {
    const key = this.buildKey(productId, voteCount, ageBucket);
    // Refresh recency so eviction drops the least recently written entries first.
    if (this.scores.has(key)) {
      this.scores.delete(key);
    }
    while (this.scores.size >= MAX_RANKING_CACHE_ENTRIES) {
      const oldest = this.scores.keys().next();
      if (oldest.done) {
        break;
      }
      this.scores.delete(oldest.value);
    }
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

  private logCacheAccess(cacheStatus: string, cacheInvalidationReason?: string): void {
    if (!isLogEnabled()) {
      return;
    }
    console.info({
      event: 'ranking.cache_access',
      cacheStatus,
      ...(cacheInvalidationReason ? { cacheInvalidationReason } : {}),
    });
  }
}
