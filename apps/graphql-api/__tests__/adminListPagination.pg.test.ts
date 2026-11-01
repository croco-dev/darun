import 'reflect-metadata';
import { PostgresqlCompanyRepository } from '@darun/companies-datasource';
import { GetAllCompanies, SearchCompany } from '@darun/companies-domain';
import { CompanyQueryResolver } from '@darun/companies-feature/server';
import { PostgresqlMagazineRepository } from '@darun/magazines-datasource';
import { GetMagazineList } from '@darun/magazines-domain';
import { MagazineQueryResolver } from '@darun/magazines-feature/server';
import type { Drizzle } from '@darun/provider-database';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type * as GraphQL from 'graphql';
import postgres, { type Sql } from 'postgres';
import { buildSchemaSync } from 'type-graphql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const { graphql } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;
const url = process.env.ADMIN_LIST_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('회사·매거진 관리자 목록의 실제 SQL과 GraphQL (ADMIN_LIST_TEST_DATABASE_URL 필요)', () => {
  let client: Sql;
  let schema: GraphQL.GraphQLSchema;
  let queries: string[] = [];

  beforeAll(async () => {
    const target = new URL(url!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/darun_admin_lists') {
      throw new Error('Requires isolated local darun_admin_lists database');
    }
    client = postgres(url!, {
      max: 1,
      connect_timeout: 5,
      connection: { statement_timeout: 10000 },
    });
    await migrate(drizzle(client), {
      migrationsFolder: resolve(__dirname, '../scripts/migrations'),
    });
    const db: Drizzle = drizzle(client, {
      logger: { logQuery: query => queries.push(query) },
    });
    const company = new CompanyQueryResolver(
      new GetAllCompanies(new PostgresqlCompanyRepository(db)),
      new SearchCompany(new PostgresqlCompanyRepository(db))
    );
    // 이 문서는 author 및 단건 조회를 선택하지 않는다. 해당 의존성이 호출되면 테스트가 실패한다.
    const unused = {
      execute: async () => {
        throw new Error('Unexpected unrelated query');
      },
    };
    const magazine = new MagazineQueryResolver(
      unused as never,
      unused as never,
      unused as never,
      new GetMagazineList(new PostgresqlMagazineRepository(db)),
      unused as never
    );
    schema = buildSchemaSync({
      resolvers: [CompanyQueryResolver, MagazineQueryResolver],
      container: {
        get: target => (target === CompanyQueryResolver ? company : magazine),
      },
      authChecker: ({ context }) => context.admin === true,
    });
  }, 30000);

  beforeEach(async () => {
    await client`truncate companies, magazines cascade`;
    queries = [];
  });

  afterAll(async () => {
    if (client) await client.end({ timeout: 5 });
  });

  const query = (field: string, list: string, page: number, admin = true) =>
    graphql({
      schema,
      source: `query($page: Int!) { ${field}(page: $page) { totalCount totalPages ${list} { id } } }`,
      variableValues: { page },
      contextValue: { admin },
    });

  for (const [field, list, code] of [
    ['allCompanies', 'companies', 'company/invalid-list-args'],
    ['tempAllMagazines', 'magazines', 'magazine/invalid-args'],
  ]) {
    it(`${field}: 같은 시각 101건을 포함한 103건을 생성 시각·ID 내림차순으로 순회한다`, async () => {
      // 물리 삽입 순서와 ID/시각 순서를 서로 다르게 만들어 ORDER BY 누락과 tie-break 누락을 구분한다.
      const rows = Array.from({ length: 103 }, (_, i) => {
        const n = (i * 37) % 103;
        return {
          id: `row-${String(n).padStart(3, '0')}`,
          created_at: n === 0 ? '2026-01-03T00:00:00Z' : n === 1 ? '2026-01-02T00:00:00Z' : '2026-01-01T00:00:00Z',
        };
      });
      if (list === 'companies') {
        await client`insert into companies ${client(rows.map(row => ({ ...row, name: row.id, address: '서울', type: 'startup' })))}`;
      } else {
        await client`insert into magazines ${client(rows.map(row => ({ ...row, title: row.id, slug: row.id, author_id: 'fixture', background_image_url: 'https://example.invalid/bg.png' })))}`;
      }
      const expected = [
        'row-000',
        'row-001',
        ...Array.from({ length: 101 }, (_, i) => `row-${String(102 - i).padStart(3, '0')}`),
      ];
      for (let round = 0; round < 2; round++) {
        const ids: string[] = [];
        for (const page of [1, 2, 3, 4]) {
          const result = await query(field, list, page);
          expect(result.errors).toBeUndefined();
          const data = result.data?.[field] as {
            totalCount: number;
            totalPages: number;
            [key: string]: unknown;
          };
          expect(data.totalCount).toBe(103);
          expect(data.totalPages).toBe(3);
          const items = data[list] as { id: string }[];
          expect(items.map(item => item.id)).toEqual(expected.slice((page - 1) * 50, page * 50));
          ids.push(...items.map(item => item.id));
        }
        expect(ids).toEqual(expected);
        expect(new Set(ids).size).toBe(103);
      }
    });

    it(`${field}: 잘못된 페이지는 SQL 전에 도메인 오류로 거절한다`, async () => {
      for (const page of [0, -1]) {
        const result = await query(field, list, page);
        expect(result.data).toBeNull();
        expect(result.errors).toHaveLength(1);
        expect(result.errors?.[0].message).toBe(code);
      }
      expect(queries).toEqual([]);
    });

    it(`${field}: 빈 목록은 totalCount=0과 totalPages=0을 유지한다`, async () => {
      const result = await query(field, list, 1);
      expect(result.errors).toBeUndefined();
      expect(result.data?.[field]).toEqual({
        totalCount: 0,
        totalPages: 0,
        [list]: [],
      });
    });

    it(`${field}: 관리자 권한이 없으면 SQL을 실행하지 않는다`, async () => {
      const result = await query(field, list, 1, false);
      expect(result.errors).toHaveLength(1);
      expect(queries).toEqual([]);
    });
  }
});
