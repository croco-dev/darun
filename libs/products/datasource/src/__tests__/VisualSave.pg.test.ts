import 'reflect-metadata';
import type { Drizzle } from '@darun/provider-database';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { productFlows, productFlowSteps } from '../entities/ProductFlowsSchema';
import { products } from '../entities/ProductSchema';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';
import { visualSaves } from '../entities/VisualPopularitySchema';
import { PostgresqlProductFlowRepository } from '../repositories/PostgresqlProductFlowRepository';
import { PostgresqlProductScreenshotRepository } from '../repositories/PostgresqlProductScreenshotRepository';

const url = process.env.VISUAL_SAVE_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const productId = 'visual-save-product';
const screenshotId = '01M4J60S333ZQJYAFX4RA6SBWM';
const flowId = '01M4J60S358KTV7R3SX2B8H9NS';
const otherScreenshotId = '01M4J60S333ZQJYAFX4RA6SBWN';
const otherFlowId = '01M4J60S358KTV7R3SX2B8H9NT';

suite('계정 저장의 PostgreSQL 수렴', () => {
  let client: postgres.Sql;
  let db: Drizzle;
  let shots: PostgresqlProductScreenshotRepository;
  let flows: PostgresqlProductFlowRepository;
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/darun_visual_save' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      target.search ||
      target.hash
    ) {
      throw new Error('Requires isolated local darun_visual_save database');
    }
    client = postgres(url!, {
      max: 8,
      connect_timeout: 5,
      connection: { statement_timeout: 5000 },
    });
    db = drizzle(client);
    shots = new PostgresqlProductScreenshotRepository(db);
    flows = new PostgresqlProductFlowRepository(db);
    await migrate(db, {
      migrationsFolder: resolve(__dirname, '../../../../../apps/graphql-api/scripts/migrations'),
    });
    await db.insert(products).values({
      id: productId,
      slug: productId,
      name: 'Save',
      summary: '',
      logoUrl: '',
      publishedAt: new Date(),
    });
    await db.insert(productScreenshots).values(
      [screenshotId, otherScreenshotId].map(id => ({
        id,
        productId,
        imageUrl: 'https://example.com/save.png',
        imageAlt: 'Save',
      }))
    );
    await db.insert(productFlows).values(
      [flowId, otherFlowId].map(id => ({
        id,
        productId,
        title: 'Save',
        platform: 'WEB',
        flowType: 'SEARCH',
      }))
    );
    await db.insert(productFlowSteps).values(
      [flowId, otherFlowId].map(id => ({
        flowId: id,
        screenshotId,
        position: 0,
        caption: '',
      }))
    );
  }, 30_000);
  afterAll(async () => {
    try {
      if (db) {
        await db.delete(productFlows).where(eq(productFlows.productId, productId));
        await db.delete(productScreenshots).where(eq(productScreenshots.productId, productId));
        await db.delete(products).where(eq(products.id, productId));
      }
    } finally {
      await client?.end({ timeout: 5 });
    }
  });
  beforeEach(async () => {
    await db.delete(visualSaves);
  });

  describe.each(['screenshot', 'flow'] as const)('%s', kind => {
    const target = () => (kind === 'screenshot' ? { screenshotId } : { flowId });
    const set = (saved: boolean, userId = 'save-user') =>
      kind === 'screenshot'
        ? shots.setVisualSave({ screenshotId, userId, saved })
        : flows.setVisualSave({ flowId, userId, saved });
    const toggle = () =>
      kind === 'screenshot'
        ? shots.toggleVisualSave({ screenshotId, userId: 'save-user' })
        : flows.toggleVisualSave({ flowId, userId: 'save-user' });
    const status = () =>
      kind === 'screenshot'
        ? shots.isVisualSaved({ screenshotId, userId: 'save-user' })
        : flows.isVisualSaved({ flowId, userId: 'save-user' });

    it('같은 저장·해제 목표의 병렬 요청과 재전송은 하나의 상태로 수렴한다', async () => {
      expect(await Promise.all(Array.from({ length: 8 }, () => set(true)))).toEqual(Array(8).fill({ saved: true }));
      const before = await db.select().from(visualSaves);
      expect(before).toHaveLength(1);
      expect(await set(true)).toEqual({ saved: true });
      expect(await db.select().from(visualSaves)).toEqual(before);
      expect(await status()).toBe(true);
      expect(
        await shots.findVisualSavesByUser({
          userId: 'save-user',
          kind,
          limit: 24,
          offset: 0,
        })
      ).toMatchObject({ totalCount: 1 });
      const cards =
        kind === 'screenshot'
          ? await shots.findManyVisualSavedScreenshotsByUser({
              userId: 'save-user',
              limit: 24,
              offset: 0,
            })
          : await flows.findManyVisualSavedFlowsByUser({
              userId: 'save-user',
              limit: 24,
              offset: 0,
            });
      expect(cards.totalCount).toBe(1);
      expect(await Promise.all(Array.from({ length: 8 }, () => set(false)))).toEqual(Array(8).fill({ saved: false }));
      expect(await status()).toBe(false);
      expect(
        await shots.findVisualSavesByUser({
          userId: 'save-user',
          kind,
          limit: 24,
          offset: 0,
        })
      ).toMatchObject({ totalCount: 0 });
    });

    it('기존 토글의 병렬 요청을 순차 토글과 같은 결과로 직렬화한다', async () => {
      const results = await Promise.all(Array.from({ length: 8 }, toggle));
      expect(results.filter(result => result.saved)).toHaveLength(4);
      expect(await status()).toBe(false);
      await set(true);
      const deletes = await Promise.all([toggle(), toggle()]);
      expect(deletes.map(result => result.saved).sort()).toEqual([false, true]);
      expect(await status()).toBe(true);
    });

    it('다른 계정의 저장과 다른 대상은 보존한다', async () => {
      await set(true, 'other-user');
      await db.insert(visualSaves).values({
        userId: 'save-user',
        ...(kind === 'screenshot' ? { screenshotId: otherScreenshotId } : { flowId: otherFlowId }),
      });
      await set(true);
      await set(false);
      const remaining = await db.select().from(visualSaves);
      expect(remaining).toHaveLength(2);
      expect(remaining).toEqual(
        expect.arrayContaining([expect.objectContaining({ userId: 'other-user', ...target() })])
      );
    });

    it('같은 대상의 기존 writer를 기다리며 다른 계정·대상·종류는 완료한다', async () => {
      // Hold an actual DELETE row lock. The set(false) writer then holds its advisory lock while blocked.
      const blocker = await client.reserve();
      const observer = await client.reserve();
      await set(true);
      let pending: Promise<{ saved: boolean }> | undefined;
      let legacy: Promise<{ saved: boolean }> | undefined;
      try {
        await blocker`begin`;
        await blocker`delete from visual_saves where user_id = 'save-user'`;
        pending = set(false);
        const deadline = Date.now() + 4000;
        let waiting = false;
        while (Date.now() < deadline) {
          const rows =
            await observer`select 1 from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query like 'delete from %visual_saves%'`;
          if (rows.length) {
            waiting = true;
            break;
          }
        }
        expect(waiting).toBe(true);
        legacy = toggle();
        // Fail fast rather than hang if the implementation accidentally uses a global lock.
        await set(true, 'other-user');
        if (kind === 'screenshot')
          await flows.setVisualSave({
            flowId,
            userId: 'save-user',
            saved: true,
          });
        else
          await shots.setVisualSave({
            screenshotId,
            userId: 'save-user',
            saved: true,
          });
        const independentId = kind === 'screenshot' ? otherScreenshotId : otherFlowId;
        if (kind === 'screenshot')
          await shots.setVisualSave({
            screenshotId: independentId,
            userId: 'save-user',
            saved: true,
          });
        else
          await flows.setVisualSave({
            flowId: independentId,
            userId: 'save-user',
            saved: true,
          });
        await blocker`rollback`;
        expect(await pending).toEqual({ saved: false });
        expect(await legacy).toEqual({ saved: true });
        expect(await status()).toBe(true);
      } finally {
        await blocker`rollback`;
        await Promise.all([pending, legacy]);
        blocker.release();
        observer.release();
      }
    });
  });
});
