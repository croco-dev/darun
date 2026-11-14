import 'reflect-metadata';
import { PosgresqlProfileRepository } from '@darun/accounts-datasource';
import { GetProfile } from '@darun/accounts-domain';
import { PostgresqlMagazineRepository } from '@darun/magazines-datasource';
import { GetMagazine, GetMagazineList, GetPublishedMagazine, GetPublishedMagazineList } from '@darun/magazines-domain';
import { MagazineQueryResolver } from '@darun/magazines-feature/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { GraphQLSchema } from 'graphql';
import postgres, { type Sql } from 'postgres';
import { buildSchema } from 'type-graphql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { formatServerError } from '../../../libs/shared/utils-apollo-server/src/libs/createServer/formatError';

const { graphql } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const { ApolloServer } = createRequire(import.meta.url)('@apollo/server') as typeof import('@apollo/server');
const url = process.env.MAGAZINE_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite('공개 매거진 GraphQL 페이지와 선택 필드 SQL', () => {
  let client: Sql;
  let schema: GraphQLSchema;
  let server: InstanceType<typeof ApolloServer>;
  let queries: string[];
  const previousSecret = process.env.CURSOR_SIGNATURE_SECRET;
  beforeAll(async () => {
    process.env.CURSOR_SIGNATURE_SECRET = 'magazine-pagination-fixture-secret';
    const target = new URL(url!);
    if (target.hostname !== '127.0.0.1' || target.pathname !== '/darun_magazine_pagination') {
      throw new Error('Requires isolated local darun_magazine_pagination database');
    }
    client = postgres(url!, { max: 2, connect_timeout: 5 });
    const db = drizzle(client, {
      logger: { logQuery: query => queries.push(query) },
    });
    await migrate(drizzle(client), {
      migrationsFolder: resolve(__dirname, '../scripts/migrations'),
    });
    await client`truncate magazines, profiles`;
    await client`insert into profiles (id,user_id,display_name) values ('author-a','user-a','작성자 A'), ('author-b','user-b','작성자 B')`;
    await client`insert into magazines (id,slug,title,author_id,background_image_url,content,published_at)
      select 'm-' || lpad(i::text,4,'0'), 'article-' || i, 'Article ' || i,
        case when i % 3 = 0 then 'missing-user' when i % 3 = 1 then 'user-a' else 'user-b' end,
        '', repeat('body-' || i,1000), case when i <= 257 then
          '2026-01-01 12:00:00'::timestamp + ((i % 5)::text || ' microseconds')::interval else null end
      from generate_series(1,263) i`;
    const repo = new PostgresqlMagazineRepository(db);
    const resolver = new MagazineQueryResolver(
      new GetPublishedMagazine(repo),
      new GetMagazine(repo),
      new GetProfile(new PosgresqlProfileRepository(db)),
      new GetMagazineList(repo),
      new GetPublishedMagazineList(repo)
    );
    schema = await buildSchema({
      resolvers: [MagazineQueryResolver],
      authChecker: () => false,
      container: { get: () => resolver },
    });
    server = new ApolloServer({
      schema,
      formatError: (formatted, error) => formatServerError(formatted, error, false),
    });
  }, 30_000);
  afterAll(async () => {
    if (previousSecret === undefined) delete process.env.CURSOR_SIGNATURE_SECRET;
    else process.env.CURSOR_SIGNATURE_SECRET = previousSecret;
    await server?.stop();
    await client?.end({ timeout: 5 });
  });

  it('첫 목록은 본문·저자를 읽지 않고 기본 24건으로 제한한다', async () => {
    queries = [];
    const result = await graphql({
      schema,
      source: '{ publishedMagazines { edges { node { id slug publishedAt } } pageInfo { hasNextPage endCursor } } }',
      contextValue: {},
    });
    expect(result.errors).toBeUndefined();
    expect((result.data?.publishedMagazines as { edges: unknown[] }).edges).toHaveLength(24);
    expect(queries).toHaveLength(1);
    expect(queries[0]).not.toContain('"content"');
  });
  const pageQuery = `query Page($first: Int, $after: String) {
    publishedMagazines(first: $first, after: $after) {
      edges { node { id slug publishedAt } } pageInfo { hasNextPage endCursor }
    }
  }`;

  it('같은 시각과 마이크로초 경계의 257개 글을 중복·누락 없이 순회하고 초안을 제외한다', async () => {
    const ids: string[] = [];
    let after: string | undefined;
    queries = [];
    for (let pageNumber = 0; pageNumber < 12; pageNumber++) {
      const result = await graphql({
        schema,
        source: pageQuery,
        variableValues: { after },
        contextValue: {},
      });
      expect(result.errors).toBeUndefined();
      const page = result.data!.publishedMagazines as {
        edges: { node: { id: string } }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
      expect(page.edges.length).toBeLessThanOrEqual(24);
      ids.push(...page.edges.map(edge => edge.node.id));
      if (!page.pageInfo.hasNextPage) break;
      after = page.pageInfo.endCursor;
    }
    const expected = [4, 3, 2, 1, 0].flatMap(remainder =>
      Array.from({ length: 257 }, (_, i) => 257 - i)
        .filter(i => i % 5 === remainder)
        .map(i => `m-${String(i).padStart(4, '0')}`)
    );
    expect(ids).toEqual(expected);
    expect(new Set(ids).size).toBe(257);
    expect(queries).toHaveLength(11);
    expect(queries.every(query => !query.includes('"content"') && !query.includes('"profiles"'))).toBe(true);
    expect(queries.every(query => /limit \$\d+/.test(query))).toBe(true);
  });

  it('본문·저자를 선택하면 페이지 안에서 일괄 조회하고 다른 요청은 최신 값을 읽는다', async () => {
    queries = [];
    const source = `{ publishedMagazines(first: 100) { edges { node { id content author { id name } } } } }`;
    const result = await graphql({ schema, source, contextValue: {} });
    expect(result.errors).toBeUndefined();
    const edges = (
      result.data!.publishedMagazines as {
        edges: {
          node: {
            id: string;
            content: string;
            author: { name: string } | null;
          };
        }[];
      }
    ).edges;
    expect(edges).toHaveLength(100);
    for (const { node } of edges) {
      const index = Number(node.id.slice(2));
      expect(node.content).toBe(`body-${index}`.repeat(1000));
      expect(node.author?.name ?? null).toBe(index % 3 === 0 ? null : index % 3 === 1 ? '작성자 A' : '작성자 B');
    }
    expect(queries).toHaveLength(3);
    expect(queries.filter(query => query.includes('"profiles"'))).toHaveLength(1);
    expect(queries.filter(query => query.includes('"content"'))).toHaveLength(1);
    await client`update profiles set display_name = '새 이름' where user_id = 'user-a'`;
    await client`update magazines set content = '바뀐 본문' where id = ${edges[0].node.id}`;
    const refreshed = await graphql({ schema, source, contextValue: {} });
    expect(refreshed.errors).toBeUndefined();
    const nodes = (refreshed.data!.publishedMagazines as { edges: typeof edges }).edges;
    expect(nodes[0].node.content).toBe('바뀐 본문');
    expect(nodes.some(({ node }) => node.author?.name === '새 이름')).toBe(true);
  });

  it.each([0, 101, -1, 1.5])('first=%s를 SQL 없이 거절한다', async first => {
    queries = [];
    const result = await graphql({
      schema,
      source: pageQuery,
      variableValues: { first },
      contextValue: {},
    });
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(queries).toHaveLength(0);
  });

  it('변조된 커서를 SQL 없이 거절한다', async () => {
    queries = [];
    const result = await graphql({
      schema,
      source: pageQuery,
      variableValues: { after: 'untrusted' },
      contextValue: {},
    });
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(queries).toHaveLength(0);
  });
  it.each([{ first: 101 }, { after: 'untrusted' }])(
    '운영 Apollo 오류 포맷에서도 잘못된 페이지 입력 %j를 공개 오류 코드로 거절한다',
    async variables => {
      queries = [];
      const response = await server.executeOperation({ query: pageQuery, variables }, { contextValue: {} });
      if (response.body.kind !== 'single') throw new Error('Expected one GraphQL result');
      expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('magazine/invalid-args');
      expect(queries).toHaveLength(0);
    }
  );
});
