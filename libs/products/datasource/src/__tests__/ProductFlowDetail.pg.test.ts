import 'reflect-metadata';
import { eq, inArray } from 'drizzle-orm';
import { drizzle, PostgresJsPreparedQuery } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { productFlows, productFlowSteps } from '../entities/ProductFlowsSchema';
import { products } from '../entities/ProductSchema';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';
import { visualSaves } from '../entities/VisualPopularitySchema';
import { PostgresqlProductFlowRepository } from '../repositories/PostgresqlProductFlowRepository';

const url = process.env.FLOW_DETAIL_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const productId = 'flow-detail-product';
const flowId = 'flow-detail';
const secondFlowId = 'flow-second';
const productLogoUrl = 'https://example.com/flow-product-logo.png';
const productSummary = '저장된 상품 요약';
const oldShot = {
  id: 'flow-old-shot',
  imageUrl: 'https://example.com/old.png',
  imageAlt: 'Old screen',
  title: null,
};
const nextShot = {
  id: 'flow-new-shot',
  imageUrl: 'https://example.com/new.png',
  imageAlt: 'New screen',
  title: 'New',
};

suite('플로 상세의 PostgreSQL 스냅샷', () => {
  let reader: postgres.Sql;
  let writer: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repo: PostgresqlProductFlowRepository;
  let fixturesInserted = false;
  const queries: string[] = [];

  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/darun_flow_detail' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      target.search ||
      target.hash
    ) {
      throw new Error('Requires isolated local darun_flow_detail database');
    }
    reader = postgres(url!, { max: 1, connect_timeout: 5 });
    writer = postgres(url!, { max: 1, connect_timeout: 5 });
    db = drizzle(writer);
    repo = new PostgresqlProductFlowRepository(drizzle(reader, { logger: { logQuery: query => queries.push(query) } }));
    await migrate(db, {
      migrationsFolder: resolve(__dirname, '../../../../../apps/graphql-api/scripts/migrations'),
    });
    await db.transaction(async tx => {
      await tx.insert(products).values({
        id: productId,
        slug: productId,
        name: 'Flow product',
        summary: '',
        logoUrl: '',
      });
      await tx.insert(productScreenshots).values([
        { ...oldShot, productId },
        { ...nextShot, productId },
      ]);
    });
    fixturesInserted = true;
  }, 30_000);

  afterAll(async () => {
    try {
      if (fixturesInserted) {
        await db.transaction(async tx => {
          await tx.delete(productFlows).where(inArray(productFlows.id, [flowId, secondFlowId]));
          await tx.delete(productScreenshots).where(eq(productScreenshots.productId, productId));
          await tx.delete(products).where(eq(products.id, productId));
        });
      }
    } finally {
      await Promise.all([reader?.end({ timeout: 5 }), writer?.end({ timeout: 5 })]);
    }
  });

  beforeEach(async () => {
    await db.transaction(async tx => {
      await tx
        .update(products)
        .set({
          publishedAt: new Date('2026-01-01T00:00:00Z'),
          logoUrl: productLogoUrl,
          summary: productSummary,
        })
        .where(eq(products.id, productId));
      await tx.delete(productFlows).where(inArray(productFlows.id, [flowId, secondFlowId]));
      await tx.insert(productFlows).values({
        id: flowId,
        productId,
        title: 'Old title',
        description: 'Old description',
        platform: 'WEB',
        flowType: 'SEARCH',
      });
      await tx.insert(productFlowSteps).values([
        {
          flowId,
          screenshotId: nextShot.id,
          position: 1,
          caption: 'Second step',
        },
        {
          flowId,
          screenshotId: oldShot.id,
          position: 0,
          caption: 'First step',
        },
      ]);
    });
  });

  async function commitAfterFirstRead<T>(read: () => Promise<T>, commit: () => Promise<unknown>): Promise<T> {
    const execute = PostgresJsPreparedQuery.prototype.execute;
    // Let PostgreSQL return the first result before the other connection commits.
    const barrier = vi.spyOn(PostgresJsPreparedQuery.prototype, 'execute').mockImplementationOnce(async function (
      this: PostgresJsPreparedQuery<{
        execute: unknown;
        all: unknown;
        values: unknown;
      }>,
      values
    ) {
      const result = await execute.call(this, values);
      await commit();
      return result;
    });
    try {
      return await read();
    } finally {
      barrier.mockRestore();
    }
  }

  describe.each(['findVisualPublishedById', 'findAdminFlowDetailById'] as const)('%s', method => {
    const read = () => repo[method](flowId);
    const oldDetail = {
      title: 'Old title',
      description: 'Old description',
      steps: [
        { position: 0, caption: 'First step', screenshot: oldShot },
        { position: 1, caption: 'Second step', screenshot: nextShot },
      ],
    };

    it('설명과 단계를 교체하는 커밋과 겹쳐도 첫 저장본 전체를 읽는다', async () => {
      const detail = await commitAfterFirstRead(read, () =>
        db.transaction(async tx => {
          await tx
            .update(productFlows)
            .set({ title: 'New title', description: 'New description' })
            .where(eq(productFlows.id, flowId));
          await tx.delete(productFlowSteps).where(eq(productFlowSteps.flowId, flowId));
          await tx.insert(productFlowSteps).values([
            {
              flowId,
              screenshotId: oldShot.id,
              position: 1,
              caption: 'New second step',
            },
            {
              flowId,
              screenshotId: nextShot.id,
              position: 0,
              caption: 'New first step',
            },
          ]);
        })
      );

      expect(detail).toMatchObject(oldDetail);
      expect(await read()).toMatchObject({
        title: 'New title',
        description: 'New description',
        steps: [
          { position: 0, caption: 'New first step', screenshot: nextShot },
          { position: 1, caption: 'New second step', screenshot: oldShot },
        ],
      });
    });

    it('삭제와 겹친 조회에는 기존 단계를 보존하고 이후 조회는 null을 반환한다', async () => {
      const detail = await commitAfterFirstRead(read, () => db.delete(productFlows).where(eq(productFlows.id, flowId)));

      expect(detail).toMatchObject(oldDetail);
      expect(await read()).toBeNull();
    });
  });

  describe.each([
    ['공개 상세', () => repo.findVisualPublishedById(flowId).then(flow => [flow]), 1],
    ['관리자 상세', () => repo.findAdminFlowDetailById(flowId).then(flow => [flow]), 1],
    ['최신 목록', () => repo.findManyVisualPublishedByFilterAndAfterIdAndLimit({ query: '' }, 24), 1],
    ['인기 목록', () => repo.findManyVisualPublishedByFilterAndPageAndLimit({ query: '' }, 1, 24), 1],
    ['화면의 연관 플로', () => repo.findManyVisualPublishedByScreenshotId(oldShot.id), 1],
    [
      '저장 목록',
      () =>
        repo
          .findManyVisualSavedFlowsByUser({
            userId: 'flow-product-test',
            limit: 24,
            offset: 0,
          })
          .then(result => result.flows),
      2,
    ],
  ] as const)('%s 상품 정보', (_name, read, queryCount) => {
    it('JOIN으로 실제 로고·요약을 읽고 다른 연결의 수정과 빈 값도 반영한다', async () => {
      await db.insert(productFlows).values({
        id: secondFlowId,
        productId,
        title: 'Second flow',
        description: '',
        platform: 'WEB',
        flowType: 'SEARCH',
      });
      await db.insert(productFlowSteps).values({
        flowId: secondFlowId,
        screenshotId: oldShot.id,
        position: 0,
        caption: '',
      });
      await db.insert(visualSaves).values([
        { userId: 'flow-product-test', flowId },
        { userId: 'flow-product-test', flowId: secondFlowId },
      ]);
      queries.length = 0;
      const flows = await read();
      expect(queries).toHaveLength(queryCount);
      expect(flows).toHaveLength(_name.includes('상세') ? 1 : 2);
      for (const flow of flows) expect(flow).toMatchObject({ productLogoUrl, productSummary });

      await db
        .update(products)
        .set({
          logoUrl: 'https://example.com/replaced.png',
          summary: '바뀐 요약',
        })
        .where(eq(products.id, productId));
      for (const flow of await read())
        expect(flow).toMatchObject({
          productLogoUrl: 'https://example.com/replaced.png',
          productSummary: '바뀐 요약',
        });
      await db.update(products).set({ logoUrl: '', summary: '' }).where(eq(products.id, productId));
      for (const flow of await read()) expect(flow).toMatchObject({ productLogoUrl: '', productSummary: '' });
    });
  });

  it('공개 조회에서 미발행 상품을 제외하고 관리자 조회는 단계 없는 플로도 반환한다', async () => {
    await db.update(products).set({ publishedAt: null }).where(eq(products.id, productId));
    await db.delete(productFlowSteps).where(eq(productFlowSteps.flowId, flowId));

    expect(await repo.findVisualPublishedById(flowId)).toBeNull();
    expect(await repo.findAdminFlowDetailById(flowId)).toMatchObject({
      id: flowId,
      steps: [],
    });
  });
});
