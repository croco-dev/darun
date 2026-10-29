import type { Drizzle } from '@darun/provider-database';
import { and, eq, gte, sql } from 'drizzle-orm';
import { visualViewEvents } from '../entities/VisualPopularitySchema';

export function recordVisualView(
  db: Drizzle,
  params: { screenshotId?: string; flowId?: string; viewerHash: string }
): Promise<boolean> {
  const lockKey = `visual-view:${JSON.stringify([params.screenshotId ?? null, params.flowId ?? null, params.viewerHash])}`;
  return db.transaction(
    async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
      // Take the window and event time after waiting for the previous writer.
      const now = new Date(Date.now());
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const conditions = [eq(visualViewEvents.viewerHash, params.viewerHash), gte(visualViewEvents.createdAt, since)];
      if (params.screenshotId) {
        conditions.push(eq(visualViewEvents.screenshotId, params.screenshotId));
      }
      if (params.flowId) {
        conditions.push(eq(visualViewEvents.flowId, params.flowId));
      }
      const existing = await tx
        .select({ id: visualViewEvents.id })
        .from(visualViewEvents)
        .where(and(...conditions))
        .limit(1);
      if (existing.length > 0) {
        return false;
      }
      await tx.insert(visualViewEvents).values({
        screenshotId: params.screenshotId ?? null,
        flowId: params.flowId ?? null,
        viewerHash: params.viewerHash,
        createdAt: now,
      });
      return true;
    },
    { isolationLevel: 'read committed' }
  );
}
