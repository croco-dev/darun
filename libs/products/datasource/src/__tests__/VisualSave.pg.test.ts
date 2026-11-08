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
  async function seedTargets() {
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
  }
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
    await seedTargets();
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

  describe.each(['screenshot', 'flow'] as const)('%s 이어읽기', kind => {
    it('저장 시각의 마이크로초를 보존하고 다른 계정·종류의 저장을 섞지 않는다', async () => {
      await client`insert into visual_saves (id, user_id, screenshot_id, flow_id, created_at) values
        ('00000000000000000000000001', 'precision', ${screenshotId}, null, '2026-01-02 03:04:05.123456'),
        ('00000000000000000000000002', 'precision', null, ${flowId}, '2026-01-02 03:04:05.123456'),
        ('00000000000000000000000003', 'precision', ${otherScreenshotId}, null, '2026-01-02 03:04:05.123455'),
        ('00000000000000000000000004', 'precision', null, ${otherFlowId}, '2026-01-02 03:04:05.123455'),
        ('00000000000000000000000005', 'other', ${screenshotId}, null, '2026-01-01'),
        ('00000000000000000000000006', 'other', null, ${flowId}, '2026-01-01')`;
      if (kind === 'screenshot') {
        const first = await shots.findManyVisualSavedScreenshotsByUser({
          userId: 'precision',
          limit: 1,
          offset: 0,
        });
        expect(first.screenshots[0].saveCursor).toEqual({
          savedAt: '2026-01-02T03:04:05.123456',
          saveId: '00000000000000000000000001',
        });
        const next = await shots.findManyVisualSavedScreenshotsByUser({
          userId: 'precision',
          limit: 24,
          offset: 0,
          after: first.screenshots[0].saveCursor,
        });
        expect(next.screenshots.map(item => item.id)).toEqual([otherScreenshotId]);
      } else {
        const first = await flows.findManyVisualSavedFlowsByUser({
          userId: 'precision',
          limit: 1,
          offset: 0,
        });
        expect(first.flows[0].saveCursor).toEqual({
          savedAt: '2026-01-02T03:04:05.123456',
          saveId: '00000000000000000000000002',
        });
        const next = await flows.findManyVisualSavedFlowsByUser({
          userId: 'precision',
          limit: 24,
          offset: 0,
          after: first.flows[0].saveCursor,
        });
        expect(next.flows.map(item => item.id)).toEqual([otherFlowId]);
      }
    });
    it.each(['insert', 'delete', 'delete-boundary'] as const)(
      '첫 24개 뒤 %s가 있어도 경계 뒤 여섯 항목을 빠짐없이 읽는다',
      async change => {
        const ids = Array.from({ length: 31 }, (_, i) => String(100 + i).padStart(26, '0'));
        const saveIds = ids.map((_, i) => String(200 + i).padStart(26, '0'));
        await db.insert(productScreenshots).values(
          ids.map(id => ({
            id,
            productId,
            imageUrl: 'https://example.com/a',
            imageAlt: id,
          }))
        );
        if (kind === 'flow') {
          await db.insert(productFlows).values(
            ids.map(id => ({
              id,
              productId,
              title: id,
              platform: 'WEB',
              flowType: 'SEARCH',
            }))
          );
          await db.insert(productFlowSteps).values(
            ids.map(id => ({
              flowId: id,
              screenshotId: id,
              position: 0,
              caption: '',
            }))
          );
        }
        const peer = postgres(url!, {
          max: 1,
          connect_timeout: 5,
          connection: { statement_timeout: 5000 },
        });
        const otherDb = drizzle(peer);
        const read = (after?: { savedAt: string; saveId: string }) =>
          kind === 'screenshot'
            ? shots.findManyVisualSavedScreenshotsByUser({
                userId: 'reader',
                limit: 24,
                offset: after ? 24 : 0,
                ...(after ? { after } : {}),
              })
            : flows.findManyVisualSavedFlowsByUser({
                userId: 'reader',
                limit: 24,
                offset: after ? 24 : 0,
                ...(after ? { after } : {}),
              });
        const itemIds = (result: Awaited<ReturnType<typeof read>>) =>
          ('screenshots' in result ? result.screenshots : result.flows).map(item => item.id);
        try {
          await otherDb.insert(visualSaves).values(
            ids.slice(0, 30).map((id, i) => ({
              id: saveIds[i],
              userId: 'reader',
              ...(kind === 'screenshot' ? { screenshotId: id } : { flowId: id }),
              createdAt: new Date('2026-01-02T03:04:05.123Z'),
            }))
          );
          expect(itemIds(await read())).toEqual(ids.slice(6, 30).reverse());
          // The boundary belongs to the save, not to the screenshot/flow, and survives its deletion.
          const boundary = {
            savedAt: '2026-01-02T03:04:05.123000',
            saveId: saveIds[6],
          };
          if (change === 'insert') {
            await otherDb.insert(visualSaves).values({
              id: saveIds[30],
              userId: 'reader',
              ...(kind === 'screenshot' ? { screenshotId: ids[30] } : { flowId: ids[30] }),
              createdAt: new Date('2026-01-03T00:00:00Z'),
            });
          } else {
            await otherDb.delete(visualSaves).where(eq(visualSaves.id, saveIds[change === 'delete' ? 29 : 6]));
          }
          expect(itemIds(await read(boundary))).toEqual(ids.slice(0, 6).reverse());
        } finally {
          await peer.end({ timeout: 5 });
          await db.delete(productFlows).where(eq(productFlows.productId, productId));
          await db.delete(productScreenshots).where(eq(productScreenshots.productId, productId));
          await seedTargets();
        }
      }
    );
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
