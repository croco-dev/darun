import dotenv from 'dotenv';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { apps, tiers, memos } from '../src/schema';

dotenv.config({});

const connectionString = process.env.DATABASE_URL!;
const db = drizzle(postgres(connectionString));

async function removeDuplicates() {
  try {
    console.log('Checking for duplicate apps...');

    const allApps = await db.select().from(apps);
    console.log(`Total apps found: ${allApps.length}`);

    const appGroups = new Map<string, typeof allApps>();

    for (const app of allApps) {
      const cleanId = app.appStoreId.split('?')[0];
      const existing = appGroups.get(cleanId) || [];
      existing.push(app);
      appGroups.set(cleanId, existing);
    }

    let duplicatesFound = 0;
    let removedCount = 0;
    let updatedCount = 0;

    for (const [cleanId, group] of appGroups.entries()) {
      // Logic:
      // 1. If group has duplicates (>1 item), pick a winner, delete losers.
      // 2. Regardless of duplicates, ensure the winner (or sole survivor) has the cleanId.

      let winner = group[0];

      if (group.length > 1) {
        duplicatesFound++;
        console.log(`Found ${group.length} duplicates for cleanId: ${cleanId}`);

        // Fetch related data for prioritization
        const appIds = group.map(a => a.id);

        const relatedTiers = await db.select().from(tiers).where(inArray(tiers.appId, appIds));

        const relatedMemos = await db.select().from(memos).where(inArray(memos.appId, appIds));

        // Score candidates
        const scoredApps = group.map(app => {
          let score = 0;

          // Tier priority
          const appTier = relatedTiers.find(t => t.appId === app.id);
          if (appTier && appTier.tier > 0) {
            score += 1000;
          }

          // Memo priority
          const appMemo = relatedMemos.find(m => m.appId === app.id);
          if (appMemo) {
            score += 100;
          }

          // Recency priority (created_at)
          // Use timestamp value for fine-grained comparison
          const createdAt = app.createdAt ? new Date(app.createdAt).getTime() : 0;
          score += createdAt / 1000000000000; // Small increment for recency

          return { app, score };
        });

        // Sort by score descending
        scoredApps.sort((a, b) => b.score - a.score);

        winner = scoredApps[0].app;
        const losers = scoredApps.slice(1).map(s => s.app);

        console.log(`Keeping app: ${winner.id} (Name: ${winner.name}) with cleanId: ${cleanId}`);

        // Delete losers
        for (const loser of losers) {
          console.log(`Removing duplicate app: ${loser.id}`);

          // Manually delete related tiers and memos for losers to be safe
          await db.delete(tiers).where(eq(tiers.appId, loser.id));
          await db.delete(memos).where(eq(memos.appId, loser.id));
          await db.delete(apps).where(eq(apps.id, loser.id));
          removedCount++;
        }
      }

      // Check if winner needs ID update
      if (winner.appStoreId !== cleanId) {
        console.log(`Updating app ${winner.id} appStoreId from ${winner.appStoreId} to ${cleanId}`);
        await db.update(apps).set({ appStoreId: cleanId }).where(eq(apps.id, winner.id));
        updatedCount++;
      }
    }

    console.log(`Finished processing.`);
    console.log(`Found ${duplicatesFound} groups of duplicates.`);
    console.log(`Removed ${removedCount} duplicate apps.`);
    console.log(`Updated ${updatedCount} apps to clean appStoreId.`);
    process.exit(0);
  } catch (error) {
    console.error('Error removing duplicates:', error);
    process.exit(1);
  }
}

removeDuplicates();
