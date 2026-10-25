import { eq, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { apps, memos, tiers } from '../src/schema';

// A conflicting group is reported intact; all other groups can be cleaned together.
export async function cleanDuplicateApps(db: PostgresJsDatabase, apply: boolean) {
  return db.transaction(async tx => {
    if (apply) {
      // This offline maintenance tool must not race app, memo, or tier writes.
      // Reads stay available; all writes and competing cleanup runs wait for commit.
      await tx.execute(sql`LOCK TABLE apps, tiers, memos IN SHARE ROW EXCLUSIVE MODE`);
    } else {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
    }

    const allApps = await tx.select().from(apps).orderBy(apps.id);
    const appGroups = new Map<string, typeof allApps>();
    for (const app of allApps) {
      const cleanId = app.appStoreId.split('?')[0];
      const group = appGroups.get(cleanId) ?? [];
      group.push(app);
      appGroups.set(cleanId, group);
    }

    const reports = [];
    for (const [cleanId, group] of appGroups) {
      if (group.length === 1 && group[0].appStoreId === cleanId) continue;
      const appIds = group.map(app => app.id);
      const relatedTiers = await tx.select().from(tiers).where(inArray(tiers.appId, appIds)).orderBy(tiers.id);
      const relatedMemos = await tx.select().from(memos).where(inArray(memos.appId, appIds)).orderBy(memos.id);
      const score = (app: typeof apps.$inferSelect) =>
        (relatedTiers.some(row => row.appId === app.id && row.tier > 0) ? 1000 : 0) +
        (relatedMemos.some(row => row.appId === app.id) ? 100 : 0);
      const ranked = [...group].sort(
        (a, b) =>
          score(b) - score(a) ||
          (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0) ||
          a.id.localeCompare(b.id)
      );
      const winner = ranked[0];
      const losers = ranked.slice(1).map(app => app.id);
      const conflicts = [];
      if (!cleanId) conflicts.push('empty App Store ID');
      if (new Set(relatedMemos.map(row => row.content)).size > 1) conflicts.push('memo content');
      // Preserve classification notes and author too; timestamps alone are provenance,
      // and identical records keep the winner's row (or a stable source row).
      if (new Set(relatedTiers.map(row => JSON.stringify([row.tier, row.notes, row.assignedBy]))).size > 1) {
        conflicts.push('tier assignment');
      }
      const keptTier = relatedTiers.find(row => row.appId === winner.id) ?? relatedTiers[0];
      const keptMemo = relatedMemos.find(row => row.appId === winner.id) ?? relatedMemos[0];
      const report = {
        cleanId,
        status: conflicts.length ? 'conflict' : apply ? 'applied' : 'dry-run',
        winner: winner.id,
        losers,
        conflicts,
        tiers: relatedTiers,
        memos: relatedMemos,
        transfers: {
          tier:
            keptTier && keptTier.appId !== winner.id ? { id: keptTier.id, from: keptTier.appId, to: winner.id } : null,
          memo:
            keptMemo && keptMemo.appId !== winner.id ? { id: keptMemo.id, from: keptMemo.appId, to: winner.id } : null,
        },
      };
      reports.push(report);
      if (!apply || conflicts.length) continue;

      const duplicateTiers = relatedTiers.filter(row => row.id !== keptTier?.id).map(row => row.id);
      const duplicateMemos = relatedMemos.filter(row => row.id !== keptMemo?.id).map(row => row.id);
      if (duplicateTiers.length) await tx.delete(tiers).where(inArray(tiers.id, duplicateTiers));
      if (keptTier && keptTier.appId !== winner.id)
        await tx.update(tiers).set({ appId: winner.id }).where(eq(tiers.id, keptTier.id));
      if (duplicateMemos.length) await tx.delete(memos).where(inArray(memos.id, duplicateMemos));
      if (keptMemo && keptMemo.appId !== winner.id)
        await tx.update(memos).set({ appId: winner.id }).where(eq(memos.id, keptMemo.id));
      if (losers.length) await tx.delete(apps).where(inArray(apps.id, losers));
      if (winner.appStoreId !== cleanId)
        await tx.update(apps).set({ appStoreId: cleanId }).where(eq(apps.id, winner.id));
    }
    return reports;
  });
}
