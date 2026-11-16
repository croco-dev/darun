import 'reflect-metadata';
import { PostgresqlProductFlowRepository, PostgresqlProductScreenshotRepository } from '@darun/products-datasource';
import { GetVisualScreenshotById, GetVisualScreenshotFlows, GetVisualScreenshots } from '@darun/products-domain';
import { VisualScreenshotQueryResolver } from '@darun/products-feature/server';
import { createServer } from '@darun/utils-apollo-server';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

const url = process.env.RELATED_FLOW_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const screenshotId = '01AAAAAAAAAAAAAAAAAAAAAAA1';
const coverId = '01AAAAAAAAAAAAAAAAAAAAAAA2';
const emptyScreenshotId = '01AAAAAAAAAAAAAAAAAAAAAAA3';
const flowId = (index: number) => String(index).padStart(26, '0');

const pageQuery = `query RelatedFlows($id: String!, $first: Int, $after: String) {
  visualScreenshot(id: $id) {
    flows(first: $first, after: $after) {
      edges { cursor node { id title stepCount coverScreenshot { id imageUrl imageAlt } } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

type RelatedFlowPage = {
  edges: { cursor: string; node: { id: string } }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

suite('공개 화면의 연관 플로 쿼리', () => {
  let client: Sql;
  let server: ReturnType<typeof createServer>;
  const queries: { sql: string; params: unknown[] }[] = [];

  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/darun_related_flows' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      target.search ||
      target.hash
    ) {
      throw new Error('Requires isolated local darun_related_flows database');
    }
    vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'related-flow-fixture-secret');
    client = postgres(url!, { max: 2, connect_timeout: 5 });
    await migrate(drizzle(client), { migrationsFolder: resolve(__dirname, '../scripts/migrations') });
    await client`delete from products where id in ('related-public', 'related-draft')`;
    await client`delete from product_screenshots where id in (${screenshotId}, ${coverId}, ${emptyScreenshotId})`;
    await client`insert into products (id, slug, name, summary, logo_url, published_at) values
      ('related-public', 'related-public', 'Public app', '', '', now()),
      ('related-draft', 'related-draft', 'Draft app', '', '', null)`;
    await client`insert into product_screenshots (id, product_id, image_url, image_alt) values
      (${screenshotId}, 'related-public', '/screen.png', 'Viewed screen'),
      (${coverId}, 'related-public', '/cover.png', 'Cover screen'),
      (${emptyScreenshotId}, 'related-public', '/empty.png', 'Unrelated screen')`;
    await client`insert into product_flows (id, product_id, title, description, platform, flow_type)
      select lpad(i::text, 26, '0'), case when i = 1002 then 'related-draft' else 'related-public' end,
        'Flow ' || i, repeat('unselected body ', 1000), 'WEB', 'SEARCH'
      from generate_series(1, 1002) i`;
    await client`insert into product_flow_steps (flow_id, screenshot_id, position)
      select id, ${screenshotId}, 1 from product_flows where product_id in ('related-public', 'related-draft')
      union all
      select id, ${coverId}, 0 from product_flows
      where product_id in ('related-public', 'related-draft') and id <> ${flowId(1001)}`;

    const db = drizzle(client, { logger: { logQuery: (sql, params) => queries.push({ sql, params }) } });
    const screenshotRepository = new PostgresqlProductScreenshotRepository(db);
    const resolver = new VisualScreenshotQueryResolver(
      new GetVisualScreenshots(screenshotRepository),
      new GetVisualScreenshotById(screenshotRepository),
      new GetVisualScreenshotFlows(new PostgresqlProductFlowRepository(db))
    );
    server = createServer({
      options: {
        resolvers: [VisualScreenshotQueryResolver],
        authChecker: () => false,
        container: { get: () => resolver },
      },
      config: { playground: false },
    });
  }, 30_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await server?.stop();
    await client?.end({ timeout: 5 });
  });

  beforeEach(() => {
    queries.length = 0;
  });

  async function execute(
    variables: { id: string; first?: number; after?: string } = { id: screenshotId },
    query = pageQuery
  ) {
    const result = await server.executeOperation<{ visualScreenshot: { flows: RelatedFlowPage } }>({
      query,
      variables,
    });
    if (result.body.kind !== 'single') throw new Error('Expected one GraphQL result');
    return result.body.singleResult;
  }

  async function readPage(variables?: Parameters<typeof execute>[0]) {
    const { errors, data } = await execute(variables);
    expect(errors).toBeUndefined();
    return data!.visualScreenshot.flows;
  }

  it('연관 플로 1,000개에서 SQL 반환은 9개, 첫 응답은 8개로 제한한다', async () => {
    const page = await readPage();
    expect(page.edges).toHaveLength(8);
    expect(page.edges[0].node).toEqual({
      id: flowId(1000),
      title: 'Flow 1000',
      stepCount: 2,
      coverScreenshot: { id: coverId, imageUrl: '/cover.png', imageAlt: 'Cover screen' },
    });
    expect(page.pageInfo).toEqual({ hasNextPage: true, endCursor: page.edges[7].cursor });
    expect(queries).toHaveLength(2);
    expect(queries[1].sql).toMatch(/order by .+ desc limit \$\d+$/);
    expect(queries[1].sql).not.toContain('"description"');
    expect(queries[1].params.at(-1)).toBe(9);
  });

  it('최대 48개씩 내림차순으로 순회하고 커버 없는 플로와 비공개 플로를 제외한다', async () => {
    const ids: string[] = [];
    let after: string | undefined;
    for (let index = 0; index < 21; index++) {
      const first = index === 20 ? 40 : 48;
      const page = await readPage({ id: screenshotId, first, after });
      ids.push(...page.edges.map(edge => edge.node.id));
      expect(page.edges).toHaveLength(first);
      expect(page.pageInfo.hasNextPage).toBe(index < 20);
      expect(page.pageInfo.endCursor).toBe(page.edges.at(-1)?.cursor);
      after = page.pageInfo.endCursor!;
    }
    expect(ids).toEqual(Array.from({ length: 1000 }, (_, index) => flowId(1000 - index)));
    expect(queries.filter(query => query.sql.includes('"product_flow_steps"'))).toHaveLength(21);
    expect(queries[1].params.at(-1)).toBe(49);
  });

  it('flows를 선택하지 않으면 관련 SQL을 실행하지 않고 관계 없음은 빈 페이지로 반환한다', async () => {
    const primary = await execute({ id: screenshotId }, 'query($id: String!) { visualScreenshot(id: $id) { id } }');
    expect(primary.errors).toBeUndefined();
    expect(primary.data?.visualScreenshot).toEqual({ id: screenshotId });
    expect(queries).toHaveLength(1);
    expect(queries[0].sql).not.toContain('"product_flow_steps"');
    expect(await readPage({ id: emptyScreenshotId })).toEqual({
      edges: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    });
  });

  it('범위를 벗어난 크기, 변조된 커서, 다른 화면의 커서는 관련 SQL 실행 전에 거절한다', async () => {
    const { pageInfo } = await readPage();
    const after = pageInfo.endCursor!;
    queries.length = 0;
    for (const variables of [
      { id: screenshotId, first: 0 },
      { id: screenshotId, first: 49 },
      { id: screenshotId, after: `z${after.slice(1)}` },
      { id: screenshotId, after: `${' '.repeat(512)}${after}` },
      { id: emptyScreenshotId, after },
    ]) {
      const result = await execute(variables);
      expect(result.errors).toMatchObject([{ extensions: { code: 'product/invalid-args' } }]);
    }
    expect(queries).toHaveLength(5);
    expect(queries.every(query => !query.sql.includes('"product_flow_steps"'))).toBe(true);
  });
});
