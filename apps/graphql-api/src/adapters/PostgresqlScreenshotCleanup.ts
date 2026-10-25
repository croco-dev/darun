import { ImageDeleterToken, type ImageDeleter } from '@darun/images-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { and, asc, eq, gt, lte, or, sql } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { randomUUID } from 'node:crypto';
import { screenshotCleanupIntents as intents } from '../../../../libs/products/datasource/src/entities/ScreenshotCleanupIntentSchema';
import { ScreenshotCleanupQueueService } from '../../../../libs/products/service/src/ScreenshotCleanupQueueService';

// Longer than the deployed worker's one-minute timeout. Expiry recovers abrupt worker termination.
const LEASE_MS = 90_000;
const DISPATCH_MS = 60_000;

function recoverable(now: Date) {
  return and(
    lte(intents.retryAfter, now),
    or(eq(intents.status, 'pending'), and(eq(intents.status, 'in_progress'), lte(intents.leaseUntil, now)))
  );
}

@Service()
export class PostgresqlScreenshotCleanup {
  constructor(
    @Inject(DrizzleToken) private readonly db: Drizzle,
    @Inject(ImageDeleterToken) private readonly images: ImageDeleter,
    private readonly queue: ScreenshotCleanupQueueService
  ) {}

  async dispatch(limit = 25): Promise<{ recovered: number; queued: number }> {
    const now = new Date();
    const candidates = await this.db
      .select({ id: intents.id })
      .from(intents)
      .where(and(recoverable(now), lte(intents.dispatchAfter, now)))
      .orderBy(asc(intents.createdAt))
      .limit(limit);
    let queued = 0;
    for (const intent of candidates) {
      const [reserved] = await this.db
        .update(intents)
        .set({ dispatchAfter: new Date(now.getTime() + DISPATCH_MS) })
        .where(and(eq(intents.id, intent.id), recoverable(now), lte(intents.dispatchAfter, now)))
        .returning({ id: intents.id });
      if (!reserved) continue;
      try {
        if (await this.queue.sendIntent(intent.id)) queued++;
      } catch {
        // Reservation expires even when SQS accepted the message but its response was lost.
        console.warn(`[ScreenshotCleanup] Queue delivery failed for ${intent.id}; recovery will retry.`);
      }
    }
    return { recovered: candidates.length, queued };
  }

  async execute(intentId: string): Promise<void> {
    const now = new Date();
    const token = randomUUID();
    const [claimed] = await this.db
      .update(intents)
      .set({
        status: 'in_progress',
        leaseToken: token,
        leaseUntil: new Date(now.getTime() + LEASE_MS),
        attemptCount: sql`${intents.attemptCount} + 1`,
        updatedAt: now,
      })
      .where(and(eq(intents.id, intentId), recoverable(now)))
      .returning();
    if (!claimed) return; // Duplicate, completed, active or not yet due.

    let error: string | null = null;
    try {
      // No transaction or Product/screenshot lock is held during provider I/O.
      // CloudinaryImageDeleter treats 'not found' as success after an ambiguous previous attempt.
      await this.images.delete(claimed.imageUrl);
    } catch {
      error = 'SCREENSHOT_IMAGE_DELETE_FAILED';
    }
    const finishedAt = new Date();
    await this.db
      .update(intents)
      .set({
        status: error ? 'pending' : 'completed',
        error,
        leaseToken: null,
        leaseUntil: null,
        retryAfter: new Date(
          finishedAt.getTime() + (error ? Math.min(3_600_000, 60_000 * 2 ** Math.min(claimed.attemptCount - 1, 6)) : 0)
        ),
        updatedAt: finishedAt,
      })
      .where(
        and(
          eq(intents.id, intentId),
          eq(intents.status, 'in_progress'),
          eq(intents.leaseToken, token),
          gt(intents.leaseUntil, finishedAt)
        )
      );
  }
}
