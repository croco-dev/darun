import type { Drizzle } from '@darun/provider-database';
import { and, eq, sql } from 'drizzle-orm';
import { visualSaves } from '../entities/VisualPopularitySchema';

export function writeVisualSave(
  db: Drizzle,
  params: {
    userId: string;
    screenshotId?: string;
    flowId?: string;
    saved: boolean | 'toggle';
  }
): Promise<{ saved: boolean }> {
  if (Boolean(params.screenshotId) === Boolean(params.flowId)) {
    throw new Error('A visual save requires exactly one target');
  }
  const lockKey = `visual-save:${JSON.stringify([params.userId, params.screenshotId ?? null, params.flowId ?? null])}`;
  const targetColumn = params.screenshotId ? visualSaves.screenshotId : visualSaves.flowId;
  const targetId = params.screenshotId ?? params.flowId!;
  const condition = and(eq(visualSaves.userId, params.userId), eq(targetColumn, targetId));
  return db.transaction(
    async tx => {
      // The row may not exist yet. All save writers use the same transaction lock.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
      let saved = params.saved;
      if (saved === 'toggle') {
        const existing = await tx.select({ id: visualSaves.id }).from(visualSaves).where(condition).limit(1);
        saved = existing.length === 0;
      }
      if (saved) {
        await tx
          .insert(visualSaves)
          .values({
            userId: params.userId,
            screenshotId: params.screenshotId ?? null,
            flowId: params.flowId ?? null,
          })
          .onConflictDoNothing({ target: [visualSaves.userId, targetColumn] });
      } else {
        await tx.delete(visualSaves).where(condition);
      }
      return { saved };
    },
    { isolationLevel: 'read committed' }
  );
}
