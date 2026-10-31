import 'reflect-metadata';
import { PostgresqlCompanyRepository } from '@darun/companies-datasource';
import { GetAllCompanies, SearchCompany } from '@darun/companies-domain';
import { CompanyQueryResolver } from '@darun/companies-feature/server';
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
const url = process.env.COMPANY_SEARCH_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('회사 자동완성의 실제 SQL과 GraphQL (COMPANY_SEARCH_TEST_DATABASE_URL 필요)', () => {
  let client: Sql;
  let repository: PostgresqlCompanyRepository;
  let schema: GraphQL.GraphQLSchema;
  let queries: string[] = [];

  beforeAll(async () => {
    const target = new URL(url!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/darun_company_search') {
      throw new Error('Requires isolated local darun_company_search database');
    }
    client = postgres(url!, { max: 1, connect_timeout: 5, connection: { statement_timeout: 10000 } });
    await migrate(drizzle(client), { migrationsFolder: resolve(__dirname, '../scripts/migrations') });
    const db: Drizzle = drizzle(client, { logger: { logQuery: query => queries.push(query) } });
    repository = new PostgresqlCompanyRepository(db);
    const resolver = new CompanyQueryResolver(new GetAllCompanies(repository), new SearchCompany(repository));
    schema = buildSchemaSync({
      resolvers: [CompanyQueryResolver],
      container: { get: () => resolver },
      authChecker: ({ context }) => context.admin === true,
    });
  }, 30000);

  beforeEach(async () => {
    await client`truncate companies cascade`;
    queries = [];
  });

  afterAll(async () => {
    if (client) await client.end({ timeout: 5 });
  });

  const seed = async (rows: { id: string; name: string }[]) => {
    await client`insert into companies ${client(rows.map(row => ({ ...row, address: '서울', type: 'startup' })))}`;
  };
  const search = (query: string, first?: number | null, admin = true) =>
    graphql({
      schema,
      source: 'query($query: String!, $first: Int) { searchCompanies(query: $query, first: $first) { id name } }',
      variableValues: { query, ...(first === undefined ? {} : { first }) },
      contextValue: { admin },
    });

  it.each(['%', '_', '\\'])('%s 문자는 wildcard로 확장하지 않는다', async query => {
    await seed([
      { id: 'literal', name: `다${query}런` },
      { id: 'ordinary', name: '다런' },
      { id: 'other', name: '다른 회사' },
    ]);
    expect((await repository.findByName(query)).map(company => company.id)).toEqual(['literal']);
  });

  it('escape 문자와 wildcard가 연속되어도 검색어 그대로 찾는다', async () => {
    await seed([
      { id: 'literal', name: 'A\\%_B' },
      { id: 'wrong', name: 'A\\xxB' },
      { id: 'sql', name: "O'Reilly" },
    ]);
    expect((await repository.findByName('\\%_')).map(company => company.id)).toEqual(['literal']);
    expect((await repository.findByName("O'Reilly")).map(company => company.id)).toEqual(['sql']);
  });

  it('2000개 후보의 기본 응답을 SQL에서 20개로 제한하고 정확한 이름을 먼저 정렬한다', async () => {
    await seed([
      ...Array.from({ length: 2000 }, (_, index) => ({
        id: `partial-${String(1999 - index).padStart(4, '0')}`,
        name: `A Match ${String(index).padStart(4, '0')}`,
      })),
      { id: 'exact-b', name: 'Match' },
      { id: 'exact-a', name: 'Match' },
      { id: 'prefix', name: 'Match Prefix' },
    ]);
    // 기존 클라이언트처럼 first를 보내지 않는 문서도 계속 실행된다.
    const result = await graphql({
      schema,
      source: 'query { searchCompanies(query: "Match") { id name } }',
      contextValue: { admin: true },
    });
    expect(result.errors).toBeUndefined();
    const rows = result.data?.searchCompanies as { id: string; name: string }[];
    expect(rows).toHaveLength(20);
    expect(rows.slice(0, 4).map(row => row.id)).toEqual(['exact-a', 'exact-b', 'partial-1999', 'partial-1998']);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatch(/limit /i);
    const repeated = await search('  match  ', 50);
    expect(repeated.errors).toBeUndefined();
    expect(repeated.data?.searchCompanies).toHaveLength(50);
    expect((repeated.data?.searchCompanies as { id: string }[]).slice(0, 2).map(row => row.id)).toEqual([
      'exact-a',
      'exact-b',
    ]);
    expect((await search('Match', 1)).data?.searchCompanies).toEqual([{ id: 'exact-a', name: 'Match' }]);
    expect((await search('Match', null)).data?.searchCompanies).toHaveLength(20);
  });

  it('저장소 직접 호출도 빈 입력과 잘못된 인자로 SELECT하지 않는다', async () => {
    expect(await repository.findByName('  ')).toEqual([]);
    await expect(repository.findByName('가'.repeat(101))).rejects.toThrow('company/invalid-search-args');
    for (const first of [0, 51, 1.5]) {
      await expect(repository.findByName('다런', first)).rejects.toThrow('company/invalid-search-args');
    }
    expect(queries).toEqual([]);
  });
});
