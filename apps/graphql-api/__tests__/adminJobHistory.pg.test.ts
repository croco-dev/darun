import 'reflect-metadata';
import { PostgresqlProductDescriptionJobRepository } from '@darun/products-datasource';
import { ProductDescriptionQueryResolver } from '@darun/products-feature/server';
import { ProductDescriptionJobService } from '@darun/products-service';
import { PostgresqlTranslationJobRepository } from '@darun/translation-datasource';
import { TranslationQueryResolver } from '@darun/translation-feature/server';
import { TranslationJobService } from '@darun/translation-service';
import { AuthRole, createAuthChecker, createServer } from '@darun/utils-apollo-server';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

const url = process.env.ADMIN_JOB_HISTORY_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('GraphQL과 PostgreSQL을 통한 관리자 작업 이력 조회', () => {
  let sql: ReturnType<typeof postgres>;
  let server: ReturnType<typeof createServer>;
  let queries: string[];
  beforeAll(async () => {
    const target = new URL(url!);
    if (target.hostname !== '127.0.0.1' || target.pathname !== '/darun_job_history') {
      throw new Error('Requires isolated local darun_job_history database');
    }
    vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'isolated-admin-job-history');
    vi.stubEnv('ALLOW_LEGACY_CURSOR', 'false');
    sql = postgres(url!, { connect_timeout: 5 });
    const db = drizzle(sql, {
      logger: { logQuery: query => queries.push(query) },
    });
    await migrate(drizzle(sql), {
      migrationsFolder: resolve(__dirname, '../scripts/migrations'),
    });

    const translation = new TranslationQueryResolver(
      new TranslationJobService(
        {} as never,
        {} as never,
        new PostgresqlTranslationJobRepository(db),
        {} as never,
        {} as never
      ),
      {} as never,
      {} as never
    );
    const description = new ProductDescriptionQueryResolver(
      new ProductDescriptionJobService(
        {} as never,
        {} as never,
        new PostgresqlProductDescriptionJobRepository(db),
        {} as never
      ),
      {} as never,
      {} as never
    );
    server = createServer({
      options: {
        resolvers: [TranslationQueryResolver, ProductDescriptionQueryResolver],
        container: {
          get: resolver => (resolver === TranslationQueryResolver ? translation : description),
        },
        authChecker: createAuthChecker(),
      },
      config: { playground: false },
    });
    await server.start();
  }, 30_000);

  beforeEach(async () => {
    queries = [];
    await sql`truncate translation_jobs, product_description_jobs`;
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await server?.stop();
    await sql?.end({ timeout: 5 });
  });

  type Page = { jobs: { id: string }[]; nextCursor: string | null };
  type Variables = { after?: string; status?: string; first?: number };
  async function request(field: string, variables: Variables = {}, admin = true) {
    const query = `query($after: String, $status: String, $first: Int) {
      page: ${field}(after: $after, status: $status, first: $first) { jobs { id } nextCursor }
    }`;
    const response = await server.executeOperation<{ page: Page }>(
      { query, variables },
      { contextValue: { getRoles: async () => (admin ? [AuthRole.Admin] : ['user']) } }
    );
    if (response.body.kind !== 'single') throw new Error('Expected single GraphQL result');
    return response.body.singleResult;
  }
  async function page(field: string, variables: Variables) {
    const result = await request(field, variables);
    expect(result.errors).toBeUndefined();
    return result.data!.page;
  }

  const kinds = [
    {
      field: 'translationJobPage',
      legacy: 'translationJobs',
      table: 'translation_jobs',
    },
    {
      field: 'productDescriptionJobPage',
      legacy: 'productDescriptionJobs',
      table: 'product_description_jobs',
    },
  ] as const;

  async function fill(table: (typeof kinds)[number]['table']) {
    const columns = table === 'translation_jobs' ? sql`entity_type, entity_id` : sql`product_id`;
    const values = table === 'translation_jobs' ? sql`'Product', 'fixture'` : sql`'fixture'`;
    await sql`insert into ${sql(table)} (id, status, created_at, ${columns})
      select case when i = 1 then 'z-older-job' else 'job-' || lpad(i::text, 3, '0') end,
        case when i in (0, 103) then 'completed' else 'in_progress' end,
        timestamp '2026-11-24 12:00:00.123456' + case
          when i = 1 then interval '-1 microsecond'
          when i = 103 then interval '2 microseconds'
          else interval '0'
        end,
        ${values}
      from generate_series(0, 103) i`;
  }

  it.each(kinds)(
    '$field 앞쪽 작업의 상태 변경과 신규 삽입 뒤에도 생성 시각과 ID 경계에서 이어 읽는다',
    async ({ field, legacy, table }) => {
      await fill(table);
      const first = await page(field, { status: 'in_progress', first: 100 });
      expect(first.jobs.map(job => job.id)).toEqual(
        Array.from({ length: 100 }, (_, i) => `job-${String(102 - i).padStart(3, '0')}`)
      );
      expect(first.nextCursor).toBeTruthy();

      await sql`update ${sql(table)} set status = 'completed' where id in ('job-102', 'job-101')`;
      await sql`insert into ${sql(table)} select (jsonb_populate_record(null::${sql(table)},
      to_jsonb(row) || '{"id":"a-newer-job","created_at":"2026-11-24T12:00:00.123457"}'::jsonb)).*
      from ${sql(table)} row where id = 'job-100'`;

      const continuationVariables = { status: 'in_progress', first: 100, after: first.nextCursor! };
      const expectedContinuation = {
        jobs: [{ id: 'job-002' }, { id: 'z-older-job' }],
        nextCursor: null,
      };
      expect(await page(field, continuationVariables)).toEqual(expectedContinuation);

      await sql`update ${sql(table)} set status = 'completed' where id = 'job-003'`;
      expect(await page(field, continuationVariables)).toEqual(expectedContinuation);
      expect((await page(field, { status: 'in_progress', first: 1 })).jobs).toEqual([{ id: 'a-newer-job' }]);
      if (table === 'product_description_jobs') {
        expect(
          queries.every(query => !query.includes('"candidate_html"') && !query.includes('"candidate_document"'))
        ).toBe(true);
      }

      const old = await server.executeOperation(
        {
          query: `{ ${legacy}(status: "in_progress", limit: 1, offset: 1) { id } }`,
        },
        { contextValue: { getRoles: async () => [AuthRole.Admin] } }
      );
      if (old.body.kind !== 'single') throw new Error('Expected single GraphQL result');
      expect(old.body.singleResult.errors).toBeUndefined();
      expect(old.body.singleResult.data).toEqual({
        [legacy]: [{ id: 'job-100' }],
      });
    }
  );

  it.each(kinds)('$field 권한이 없거나 커서의 범위가 다른 요청은 SQL 실행 전에 거절한다', async ({ field, table }) => {
    await fill(table);
    const { nextCursor } = await page(field, {
      status: 'in_progress',
      first: 1,
    });
    const otherField = kinds.find(kind => kind.field !== field)!.field;
    queries = [];
    expect((await request(field, {}, false)).errors).toHaveLength(1);
    for (const [target, variables] of [
      [field, { status: 'completed', after: nextCursor! }],
      [otherField, { status: 'in_progress', after: nextCursor! }],
      [field, { status: 'in_progress', after: 'malformed' }],
      [field, { status: 'in_progress', after: `!${nextCursor!}` }],
    ] as const) {
      expect((await request(target, variables)).errors?.[0]?.extensions?.code).toBe('pagination/invalid-cursor');
    }
    expect((await request(field, { first: 101 })).errors).toHaveLength(1);
    vi.stubEnv('ALLOW_LEGACY_CURSOR', 'true');
    try {
      const payload = Buffer.from(nextCursor!, 'base64').toString('utf8').split('__SIGNATURE_DELIMITER__')[0]!;
      const unsigned = Buffer.from(payload).toString('base64');
      expect((await request(field, { status: 'in_progress', after: unsigned })).errors?.[0]?.extensions?.code).toBe(
        'pagination/invalid-cursor'
      );
    } finally {
      vi.stubEnv('ALLOW_LEGACY_CURSOR', 'false');
    }
    expect(queries).toEqual([]);
  });

  it.each(kinds)(
    '$field 한 페이지가 가득 차도 남은 작업이 없으면 다음 커서를 반환하지 않는다',
    async ({ field, table }) => {
      await fill(table);
      await sql`delete from ${sql(table)} where id in ('job-101', 'job-102')`;
      const result = await page(field, { status: 'in_progress', first: 100 });
      expect(result.jobs).toHaveLength(100);
      expect(result.nextCursor).toBeNull();
    }
  );
});
