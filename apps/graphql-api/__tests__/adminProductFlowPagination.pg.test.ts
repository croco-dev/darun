import 'reflect-metadata';
import {
  PostgresqlProductFlowRepository,
  PostgresqlProductRepository,
  PostgresqlProductScreenshotRepository,
} from '@darun/products-datasource';
import { GetAdminProductFlow, GetAdminProductFlows, GetProduct, GetProductScreenshots } from '@darun/products-domain';
import { VisualFlowQueryResolver } from '@darun/products-feature/server';
import { AuthRole, createAuthChecker, createServer, type GraphQLContext } from '@darun/utils-apollo-server';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

const url = process.env.ADMIN_FLOW_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const flowId = (index: number) => String(index).padStart(26, '0');
const coverId = '01AAAAAAAAAAAAAAAAAAAAAAA1';

suite('관리자 상품의 플로 목록과 편집 상세', () => {
  let client: Sql;
  let server: ReturnType<typeof createServer>;
  const queries: { sql: string; params: unknown[] }[] = [];

  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/darun_admin_flows' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      target.search ||
      target.hash
    ) {
      throw new Error('Requires isolated local darun_admin_flows database');
    }
    vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'admin-flow-fixture-secret');
    client = postgres(url!, { max: 2, connect_timeout: 5 });
    await migrate(drizzle(client), { migrationsFolder: resolve(__dirname, '../scripts/migrations') });
    await client`delete from products where id in ('admin-draft', 'admin-other')`;
    await client`delete from product_screenshots where id in (${coverId}, 'second-shot', 'other-shot')`;
    await client`insert into products (id, slug, name, summary, logo_url) values
      ('admin-draft', 'admin-draft', 'Draft app', '', ''),
      ('admin-other', 'admin-other', 'Other app', '', '')`;
    await client`insert into product_screenshots (id, product_id, image_url, image_alt) values
      (${coverId}, 'admin-draft', '/cover.png', 'Draft cover'),
      ('second-shot', 'admin-draft', '/step.png', 'Draft step'),
      ('other-shot', 'admin-other', '/other.png', 'Other cover')`;
    await client`insert into product_flows (id, product_id, title, description, platform, flow_type)
      select lpad(i::text, 26, '0'), case when i = 0 then 'admin-other' else 'admin-draft' end,
        'Flow ' || i, repeat('unselected body ', 1000), 'WEB', 'SEARCH'
      from generate_series(0, 103) i order by (i * 37) % 104`;
    await client`insert into product_flow_steps (flow_id, screenshot_id, position, caption)
      select id, ${coverId}, 0, 'First step' from product_flows where product_id = 'admin-draft'
      union all
      select id, 'second-shot', 1, 'Second step' from product_flows where product_id = 'admin-draft'
      union all
      select id, 'other-shot', 0, '' from product_flows where product_id = 'admin-other'`;

    const db = drizzle(client, { logger: { logQuery: (sql, params) => queries.push({ sql, params }) } });
    const flows = new PostgresqlProductFlowRepository(db);
    const resolver = new VisualFlowQueryResolver(
      undefined!,
      undefined!,
      new GetAdminProductFlows(flows, new GetProduct(new PostgresqlProductRepository(db))),
      new GetAdminProductFlow(flows),
      undefined!,
      new GetProductScreenshots(new PostgresqlProductScreenshotRepository(db))
    );
    server = createServer({
      options: {
        resolvers: [VisualFlowQueryResolver],
        authChecker: createAuthChecker(),
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

  function contextValue(admin = true): GraphQLContext {
    return {
      requestId: 'fixture',
      getUserId: async () => (admin ? 'fixture-admin' : undefined),
      getUserIdOrThrow: async () => 'fixture-admin',
      getRoles: async () => (admin ? [AuthRole.Admin] : []),
    };
  }

  async function executePage(variables: { slug: string; after?: string | null }, admin = true, first?: number) {
    const result = await server.executeOperation<{
      adminProductFlowSummaries: {
        edges: { node: { id: string } }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(
      {
        query: `query($slug: String!, $after: String${first === undefined ? '' : ', $first: Int!'}) {
          adminProductFlowSummaries(productSlug: $slug, after: $after${first === undefined ? '' : ', first: $first'}) {
            edges { node { id title platform flowType stepCount coverScreenshot { id imageUrl imageAlt } } }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        variables: { ...variables, first },
      },
      { contextValue: contextValue(admin) }
    );
    if (result.body.kind !== 'single') throw new Error('Expected one GraphQL result');
    return result.body.singleResult;
  }

  async function readPage(after?: string | null, first?: number) {
    const { errors, data } = await executePage({ slug: 'admin-draft', after }, true, first);
    expect(errors).toBeUndefined();
    return data!.adminProductFlowSummaries;
  }

  it('미발행 상품의 첫 조회는 SQL 한 번으로 필요한 카드 24개만 반환한다', async () => {
    const page = await readPage();
    expect(page.edges.map(edge => edge.node.id)).toEqual(Array.from({ length: 24 }, (_, i) => flowId(i + 1)));
    expect(page.edges[0].node).toMatchObject({
      title: 'Flow 1',
      platform: 'WEB',
      flowType: 'SEARCH',
      stepCount: 2,
      coverScreenshot: { id: coverId, imageUrl: '/cover.png', imageAlt: 'Draft cover' },
    });
    expect(page.pageInfo).toEqual(expect.objectContaining({ hasNextPage: true, endCursor: expect.any(String) }));
    expect(queries).toHaveLength(1);
    const [{ sql, params }] = queries;
    expect(sql).toMatch(/order by "product_flows"\."id" asc limit \$\d+/);
    expect(sql).not.toMatch(/"description"|"caption"/);
    expect(params).toContain(25);
  });

  it('최대 48개씩 오름차순으로 순회하고 정확히 채운 마지막 페이지에서 끝난다', async () => {
    const first = await readPage(null, 48);
    const second = await readPage(first.pageInfo.endCursor, 48);
    const last = await readPage(second.pageInfo.endCursor, 7);
    expect(first.edges).toHaveLength(48);
    expect(second.edges).toHaveLength(48);
    expect(last.edges).toHaveLength(7);
    expect([...first.edges, ...second.edges, ...last.edges].map(edge => edge.node.id)).toEqual(
      Array.from({ length: 103 }, (_, i) => flowId(i + 1))
    );
    expect([first, second, last].map(page => page.pageInfo.hasNextPage)).toEqual([true, true, false]);
    expect(queries).toHaveLength(3);
    expect(queries[1].params).toContain(flowId(48));
    expect(queries[1].params).toContain(49);
    expect(queries[2].params).toContain(flowId(96));
  });

  it('상품이 없으면 빈 페이지이며, 권한이나 인자가 잘못되면 상품을 조회하지 않는다', async () => {
    const empty = await executePage({ slug: 'nonexistent' });
    expect(empty.errors).toBeUndefined();
    expect(empty.data?.adminProductFlowSummaries).toMatchObject({
      edges: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    });

    queries.length = 0;
    const denied = await executePage({ slug: 'admin-draft' }, false);
    expect(denied.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
    for (const first of [0, 49]) {
      const result = await executePage({ slug: 'admin-draft' }, true, first);
      expect(result.errors?.[0].extensions?.code).toBe('product/invalid-args');
    }
    const invalidCursor = await executePage({ slug: 'admin-draft', after: 'tampered' });
    expect(invalidCursor.errors?.[0].extensions?.code).toBe('product/invalid-args');
    expect(queries).toEqual([]);
  });

  it('편집 상세는 미발행 상품의 전체 설명과 순서가 지정된 단계를 유지한다', async () => {
    const result = await server.executeOperation(
      {
        query: `query($id: String!) {
          adminProductFlow(id: $id) {
            description
            steps { position caption screenshot { id } }
          }
        }`,
        variables: { id: flowId(1) },
      },
      { contextValue: contextValue() }
    );
    if (result.body.kind !== 'single') throw new Error('Expected one GraphQL result');
    expect(result.body.singleResult.errors).toBeUndefined();
    expect(result.body.singleResult.data).toEqual({
      adminProductFlow: {
        description: 'unselected body '.repeat(1000),
        steps: [
          { position: 0, caption: 'First step', screenshot: { id: coverId } },
          { position: 1, caption: 'Second step', screenshot: { id: 'second-shot' } },
        ],
      },
    });
  });
});
