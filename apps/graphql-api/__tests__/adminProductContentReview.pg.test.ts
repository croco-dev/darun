import 'reflect-metadata';
import { PostgresqlProductContentReviews, PostgresqlProductRepository } from '@darun/products-datasource';
import { EditProduct } from '@darun/products-domain';
import { AuthRole, createAuthChecker, createServer } from '@darun/utils-apollo-server';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { AdminProductContentReviewsResolver } from '../src/app/graphql/AdminProductContentReviews.resolver';

const url = process.env['PRODUCT_CONTENT_REVIEW_TEST_DATABASE_URL'];
const suite = url ? describe : describe.skip;
const productId = '00000000000000000000000001';

const recordMutation = `
  mutation RecordReview($input: RecordAdminProductContentReviewInput!) {
    review: recordAdminProductContentReview(input: $input) { id reviewerId reviewedRevision memo referenceUrl nextReviewOn }
  }
`;
const detailQuery = `
  query {
    detail: adminProductContentReview(slug: "review-fixture") {
      id revision name summary description status due features { name summary }
    }
  }
`;
const historyQuery = `
  query($id: ID!, $before: String) {
    history: adminProductContentReviewHistory(productId: $id, before: $before) {
      records { id reviewerId reviewedRevision memo referenceUrl nextReviewOn }
      nextCursor
    }
  }
`;
const listQuery = `
  query($filter: AdminProductContentReviewFilter!, $after: String) {
    page: adminProductContentReviewPage(filter: $filter, after: $after) {
      items { id name status due nextReviewOn }
      nextCursor
    }
  }
`;

suite('관리자 소개·기능 검토의 GraphQL 및 PostgreSQL 계약', () => {
  let sql: ReturnType<typeof postgres>;
  let server: ReturnType<typeof createServer>;
  let entries: string[];
  let reviewDb: ReturnType<typeof drizzle>;
  let reviewSql: ReturnType<typeof postgres>;
  let writerSql: ReturnType<typeof postgres>;
  let writerDb: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const target = new URL(url!);
    if (target.hostname !== '127.0.0.1' || target.pathname !== '/darun_product_reviews') {
      throw new Error('Requires isolated local darun_product_reviews database');
    }
    sql = postgres(url!, {
      connect_timeout: 5,
      connection: { TimeZone: 'Pacific/Honolulu' },
    });
    await migrate(drizzle(sql), {
      migrationsFolder: resolve(__dirname, '../scripts/migrations'),
    });
    reviewSql = postgres(url!, { connect_timeout: 5, connection: { application_name: 'review_submission' } });
    writerSql = postgres(url!, { connect_timeout: 5, connection: { application_name: 'review_source_edit' } });
    reviewDb = drizzle(reviewSql, { logger: { logQuery: query => entries.push(query) } });
    writerDb = drizzle(writerSql);
    const resolver = new AdminProductContentReviewsResolver(new PostgresqlProductContentReviews(reviewDb));
    server = createServer({
      options: {
        resolvers: [AdminProductContentReviewsResolver],
        container: { get: () => resolver },
        authChecker: createAuthChecker(),
      },
      config: { playground: false },
    });
    await server.start();
  }, 30_000);

  beforeEach(async () => {
    entries = [];
    await sql`delete from product_features`;
    await sql`delete from products`;
    await sql`insert into products (id, slug, name, summary, description, logo_url, content_revision)
      values (${productId}, 'review-fixture', 'Fixture', 'Summary', '<p>Body</p>', '', 1)`;
    await sql`insert into product_features (id, product_id, name, emoji, summary)
      values ('feature', ${productId}, 'Feature', '🙂', 'Feature summary')`;
  });

  afterAll(async () => {
    await server?.stop();
    await Promise.all([sql, reviewSql, writerSql].map(connection => connection?.end({ timeout: 5 })));
  });

  async function run<T>(query: string, variables: Record<string, unknown> = {}, role: 'admin' | 'user' = 'admin') {
    const response = await server.executeOperation<T>(
      { query, variables },
      {
        contextValue: {
          getRoles: async () => [role === 'admin' ? AuthRole.Admin : 'user'],
          getUserIdOrThrow: async () => 'fixture-admin',
        },
      }
    );
    if (response.body.kind !== 'single') throw new Error('Expected single GraphQL result');
    return response.body.singleResult;
  }

  function submission(extra: Record<string, unknown> = {}) {
    return {
      productId,
      expectedRevision: '1',
      requestId: randomUUID(),
      memo: '검토한 내용',
      referenceUrl: 'https://example.com/reference',
      ...extra,
    };
  }

  async function data<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const result = await run<T>(query, variables);
    expect(result.errors).toBeUndefined();
    return result.data!;
  }

  it('권한 없는 읽기와 쓰기는 저장소 실행 전에 거절한다', async () => {
    for (const [query, variables] of [
      [detailQuery, {}],
      [recordMutation, { input: submission() }],
      [historyQuery, { id: productId }],
      [listQuery, { filter: 'DUE' }],
    ] as const) {
      expect((await run(query, variables, 'user')).errors).toHaveLength(1);
    }
    expect(entries).toEqual([]);
  });

  it('동시 재전송은 하나의 검토만 기록하고 나중에 상품이 바뀌어도 원래 응답을 돌려준다', async () => {
    const before = await sql`select * from products where id = ${productId}`;
    const input = submission();
    const [first, second] = await Promise.all([data(recordMutation, { input }), data(recordMutation, { input })]);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      review: { reviewerId: 'fixture-admin', reviewedRevision: '1' },
    });
    expect(await sql`select * from products where id = ${productId}`).toEqual(before);
    expect(await sql`select id from product_content_sync_intents where product_id = ${productId}`).toEqual([]);
    expect(await sql`select id from product_content_reviews`).toHaveLength(1);
    await sql`update products set content_revision = 2 where id = ${productId}`;
    expect(await data(recordMutation, { input })).toEqual(first);
    expect((await run(recordMutation, { input: { ...input, memo: '다른 메모' } })).errors?.[0]?.extensions?.code).toBe(
      'IDEMPOTENCY_KEY_CONFLICT'
    );
  });

  it('검토 중 변경된 내용을 기록하지 않으며 재검토 뒤에도 이전 이력이 남는다', async () => {
    expect(await data(detailQuery)).toMatchObject({
      detail: {
        revision: '1',
        status: 'UNREVIEWED',
        description: '<p>Body</p>',
        features: [{ name: 'Feature', summary: 'Feature summary' }],
      },
    });
    await data(recordMutation, { input: submission() });
    expect(await data(detailQuery)).toMatchObject({
      detail: { status: 'CURRENT' },
    });
    await sql`update products set content_revision = 2, name = '최신 이름' where id = ${productId}`;
    expect(await data(detailQuery)).toMatchObject({
      detail: { revision: '2', status: 'CHANGED', name: '최신 이름' },
    });
    expect(await data(listQuery, { filter: 'CHANGED' })).toMatchObject({
      page: { items: [{ id: productId, status: 'CHANGED' }] },
    });
    expect((await run(recordMutation, { input: submission() })).errors?.[0]?.extensions?.code).toBe(
      'PRODUCT_CONTENT_REVIEW_STALE'
    );
    await data(recordMutation, {
      input: submission({ expectedRevision: '2', memo: '재검토' }),
    });
    expect(await data(historyQuery, { id: productId })).toMatchObject({
      history: {
        records: [
          {
            reviewerId: 'fixture-admin',
            reviewedRevision: '2',
            memo: '재검토',
          },
          {
            reviewerId: 'fixture-admin',
            reviewedRevision: '1',
            referenceUrl: 'https://example.com/reference',
          },
        ],
        nextCursor: null,
      },
    });
    expect(await data(detailQuery)).toMatchObject({
      detail: { status: 'CURRENT' },
    });
  });

  it.each(['edit', 'review'] as const)(
    '%s 작업이 먼저 잠그면 그 커밋을 기준으로 다른 작업이 진행된다',
    async first => {
      let locked!: () => void;
      let unlock!: () => void;
      const ready = new Promise<void>(resolve => {
        locked = resolve;
      });
      const release = new Promise<void>(resolve => {
        unlock = resolve;
      });
      const holdingDb = first === 'edit' ? writerDb : reviewDb;
      const transaction = holdingDb.transaction.bind(holdingDb);
      const gate = vi.spyOn(holdingDb, 'transaction').mockImplementation((work, options) =>
        transaction(async tx => {
          const result = await work(tx);
          locked();
          await release;
          return result;
        }, options)
      );

      const input = submission();
      const edit = () =>
        new EditProduct(new PostgresqlProductRepository(writerDb)).execute({
          id: productId,
          name: '동시 수정한 상품명',
        });
      const review = () => run(recordMutation, { input });
      const leading = first === 'edit' ? edit() : review();
      let competing: ReturnType<typeof edit> | ReturnType<typeof review> | undefined;
      try {
        await Promise.race([
          ready,
          leading.then(() => {
            throw new Error('First transaction finished before the commit gate');
          }),
        ]);
        competing = first === 'edit' ? review() : edit();
        const blockedConnection = first === 'edit' ? 'review_submission' : 'review_source_edit';
        await vi.waitFor(
          async () => {
            const [row] = await sql`select 1 from pg_stat_activity
          where datname = current_database() and application_name = ${blockedConnection} and wait_event_type = 'Lock'`;
            expect(row).toBeDefined();
          },
          { timeout: 5000 }
        );
      } finally {
        unlock();
        await Promise.allSettled([leading, competing]);
        gate.mockRestore();
      }

      const result = await (first === 'edit'
        ? (competing as ReturnType<typeof review>)
        : (leading as ReturnType<typeof review>));
      if (first === 'edit') {
        expect(result.errors?.[0]?.extensions?.code).toBe('PRODUCT_CONTENT_REVIEW_STALE');
        expect(await sql`select id from product_content_reviews`).toEqual([]);
      } else {
        expect(result.errors).toBeUndefined();
        expect(await sql`select reviewed_revision::text from product_content_reviews`).toEqual([
          { reviewed_revision: '1' },
        ]);
      }
      expect(await data(detailQuery)).toMatchObject({
        detail: {
          name: '동시 수정한 상품명',
          revision: '2',
          status: first === 'edit' ? 'UNREVIEWED' : 'CHANGED',
        },
      });
    },
    15000
  );

  it('서울 자정 전후에 같은 확인일의 표시와 필터를 함께 갱신한다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      for (const [nextReviewOn, before, after] of [
        ['2026-11-26', true, true],
        ['2026-11-28', false, true],
        ['2026-11-29', false, false],
        [null, false, false],
      ] as const) {
        await data(recordMutation, { input: submission({ nextReviewOn }) });
        for (const [instant, due] of [
          ['2026-11-27T14:59:59.999Z', before],
          ['2026-11-27T15:00:00.000Z', after],
        ] as const) {
          vi.setSystemTime(new Date(instant));
          expect(await data(detailQuery)).toMatchObject({ detail: { due } });
          expect(await data(listQuery, { filter: 'DUE' })).toMatchObject({
            page: { items: due ? [{ id: productId, due: true, nextReviewOn }] : [] },
          });
        }
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('같은 필터에서 앞쪽 결과가 바뀌어도 다음 페이지를 올바른 ID부터 조회한다', async () => {
    await sql`insert into products (id, slug, name, summary, logo_url)
      select lpad(i::text, 26, '0'), 'fixture-' || i, 'Service ' || i, '', '' from generate_series(2, 24) i`;
    type Page = {
      page: { items: { id: string }[]; nextCursor: string | null };
    };
    const first = await data<Page>(listQuery, { filter: 'UNREVIEWED' });
    expect(first.page.items).toHaveLength(20);
    await data(recordMutation, { input: submission() });
    const second = await data<Page>(listQuery, {
      filter: 'UNREVIEWED',
      after: first.page.nextCursor,
    });
    expect(second.page.items.map(item => Number(item.id))).toEqual([21, 22, 23, 24]);
    expect(second.page.nextCursor).toBeNull();
  });

  it('빈 메모, 실제 달력에 없는 날짜와 웹 링크가 아닌 참고 주소를 저장하지 않는다', async () => {
    for (const invalid of [{ memo: '  ' }, { nextReviewOn: '2026-02-30' }, { referenceUrl: 'javascript:alert(1)' }]) {
      expect((await run(recordMutation, { input: submission(invalid) })).errors?.[0]?.extensions?.code).toBe(
        'BAD_USER_INPUT'
      );
    }
    expect(entries).toEqual([]);
  });
});
