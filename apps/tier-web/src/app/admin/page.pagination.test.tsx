import {
  assertLocalPostgrestFixture,
  migrateTierPostgrestFixture,
  postgrestFixtureFetch,
} from '@/test-utils/postgrest-fixture';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from './page';

const fixture = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => fixture.client,
}));
vi.mock('@/components/admin/DeleteAppButton', () => ({
  DeleteAppButton: () => null,
}));
vi.mock('@/components/admin/MemoEditor', () => ({ MemoEditor: () => null }));
vi.mock('./AdminSearchInput', () => ({ AdminSearchInput: () => null }));
vi.mock('./AppStoreScrapeForm', () => ({ AppStoreScrapeForm: () => null }));
vi.mock('./TierSelect', () => ({ TierSelect: () => null }));

const requests: { url: URL; method: string }[] = [];
const responses: Response[] = [];

function rows(count: number, data: unknown[] = []) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json',
      'content-range': `*/${count}`,
    },
  });
}

function outOfRange() {
  return new Response(
    JSON.stringify({
      code: 'PGRST103',
      message: 'Requested range not satisfiable',
    }),
    {
      status: 416,
      headers: { 'content-type': 'application/json' },
    }
  );
}

function render(page: string, query = '100%_한국 앱') {
  return AdminPage({ searchParams: Promise.resolve({ page, query }) });
}

describe('admin page range recovery through the Supabase client', () => {
  beforeEach(() => {
    requests.length = 0;
    responses.length = 0;
    fixture.client = createClient('http://127.0.0.1:54900', 'pagination-fixture-only', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          requests.push({
            url: new URL(String(input)),
            method: init?.method ?? 'GET',
          });
          const response = responses.shift();
          if (!response) throw new Error('Unexpected fixture request');
          return response;
        },
      },
    });
  });

  it.each([
    ['ordinary', '2'],
    ['maximum integer', '9007199254740991'],
    ['overflow', '9'.repeat(400)],
  ])('preserves the literal search when recovering an %s page to the first page', async (_label, page) => {
    responses.push(outOfRange(), rows(24));
    await expect(render(page)).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/admin?query=100%25_%ED%95%9C%EA%B5%AD+%EC%95%B1;307;',
    });
    expect(requests).toHaveLength(2);
    expect(requests[1].method).toBe('HEAD');
    expect(requests[1].url.searchParams.get('offset')).toBeNull();
    for (const { url } of requests) {
      expect(url.searchParams.get('name')).toBe('ilike.%100\\%\\_한국 앱%');
    }
    const offset = Number(requests[0].url.searchParams.get('offset'));
    expect(Number.isSafeInteger(offset)).toBe(true);
    expect(Number.isSafeInteger(offset + 24)).toBe(true);
  });

  it('uses the new count after deletion to recover an old last page', async () => {
    responses.push(outOfRange(), rows(41));
    await expect(render('4', 'Calendar')).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/admin?query=Calendar&page=2;307;',
    });
  });

  it('recovers offset equal to count without treating the successful response as an error', async () => {
    responses.push(rows(25));
    await expect(render('2')).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/admin?query=100%25_%ED%95%9C%EA%B5%AD+%EC%95%B1;307;',
    });
    expect(requests).toHaveLength(1);
  });

  it('renders a normal empty first page without recovery', async () => {
    responses.push(rows(0));
    const markup = renderToStaticMarkup(await render('1'));
    expect(markup).toContain('검색 조건에 맞는 앱이 없습니다.');
    expect(markup).toContain('페이지 1 / 1');
    expect(requests).toHaveLength(1);
  });

  it('renders a valid last page with its actual results and navigation', async () => {
    responses.push(rows(26, [{ id: 'last-app', name: 'Last app', tiers: null, memos: null }]));
    const markup = renderToStaticMarkup(await render('2', 'app'));
    expect(markup).toContain('Last app');
    expect(markup).toContain('26-26 / 26');
    expect(markup).toContain('페이지 2 / 2');
    expect(markup).toMatch(/<a aria-disabled="false"[^>]*href="\/admin\?query=app">이전<\/a>/);
    expect(requests).toHaveLength(1);
  });

  it.each(['initial', 'recovery'] as const)('preserves a general %s query failure', async phase => {
    if (phase === 'recovery') responses.push(outOfRange());
    responses.push(
      new Response(
        JSON.stringify({
          code: 'XX000',
          message: 'Fixture database unavailable',
        }),
        {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }
      )
    );
    await expect(render('2')).rejects.toThrow('Fixture database unavailable');
    expect(requests).toHaveLength(phase === 'initial' ? 1 : 2);
  });

  it('keeps an unexplained range failure when a fresh count still permits the page', async () => {
    responses.push(outOfRange(), rows(60));
    await expect(render('2')).rejects.toThrow('Requested range not satisfiable');
  });

  it('does not turn a missing recovery count into an empty result', async () => {
    responses.push(outOfRange(), new Response(null));
    await expect(render('2')).rejects.toThrow('Requested range not satisfiable');
  });

  it('does not recover a range error on the first page', async () => {
    responses.push(outOfRange());
    await expect(render('1')).rejects.toThrow('Requested range not satisfiable');
    expect(requests).toHaveLength(1);
  });
});

const databaseUrl = process.env.ADMIN_PAGINATION_TEST_DATABASE_URL;
const restUrl = process.env.ADMIN_PAGINATION_TEST_POSTGREST_URL;

assertLocalPostgrestFixture(databaseUrl, restUrl, 'darun_admin_pagination');

describe.skipIf(!databaseUrl)('admin pagination with PostgreSQL and PostgREST', () => {
  const sql = postgres(databaseUrl!, {
    max: 1,
    onnotice: () => {},
    connection: { statement_timeout: 5000 },
  });
  let ownsTables = false;
  const client = createClient(restUrl ?? 'http://127.0.0.1', 'pagination-fixture-only', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: postgrestFixtureFetch },
  });

  beforeAll(async () => {
    const [existing] = await sql`select count(*)::integer as count from information_schema.tables
      where table_schema = 'public'`;
    if (existing.count !== 0) throw new Error('Pagination tests require an empty dedicated database');
    ownsTables = true;
    await migrateTierPostgrestFixture(sql, restUrl!);
    fixture.client = client;
  });

  afterAll(async () => {
    try {
      if (ownsTables) await sql`drop table if exists memos, tiers, apps, users cascade`;
    } finally {
      await sql.end();
    }
  });

  it('distinguishes equal and excessive offsets and recovers only invalid pages', async () => {
    await sql`insert into apps (app_store_id, name)
      select 'fixture-' || n, '100%_한국 앱 ' || lpad(n::text, 2, '0') from generate_series(1, 24) n`;
    await sql`insert into apps (app_store_id, name) values ('decoy', '1000X한국 앱 other')`;
    const query = '100%_한국 앱';
    const outside = await client
      .from('apps')
      .select('id', { count: 'exact' })
      .ilike('name', '%100\\%\\_한국 앱%')
      .range(25, 49);
    expect(outside.status).toBe(416);
    expect(outside.error?.code).toBe('PGRST103');
    for (const page of ['2', '9007199254740991', '9'.repeat(400)]) {
      await expect(AdminPage({ searchParams: Promise.resolve({ query, page }) })).rejects.toMatchObject({
        digest: 'NEXT_REDIRECT;replace;/admin?query=100%25_%ED%95%9C%EA%B5%AD+%EC%95%B1;307;',
      });
    }
    await sql`insert into apps (app_store_id, name) values ('twenty-five', '100%_한국 앱 25')`;
    const equal = await client
      .from('apps')
      .select('id', { count: 'exact' })
      .ilike('name', '%100\\%\\_한국 앱%')
      .range(25, 49);
    expect(equal.error).toBeNull();
    expect(equal.count).toBe(25);
    expect(equal.data).toEqual([]);
    await expect(AdminPage({ searchParams: Promise.resolve({ query, page: '2' }) })).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/admin?query=100%25_%ED%95%9C%EA%B5%AD+%EC%95%B1;307;',
    });

    await sql`insert into apps (app_store_id, name)
      select 'more-' || n, '100%_한국 앱 ' || n from generate_series(26, 76) n`;
    expect(
      renderToStaticMarkup(
        await AdminPage({
          searchParams: Promise.resolve({ query, page: '4' }),
        })
      )
    ).toContain('76-76 / 76');
    await sql`delete from apps where app_store_id like 'more-%' and app_store_id not in ('more-26', 'more-27')`;
    await expect(AdminPage({ searchParams: Promise.resolve({ query, page: '4' }) })).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/admin?query=100%25_%ED%95%9C%EA%B5%AD+%EC%95%B1&page=2;307;',
    });
    const last = renderToStaticMarkup(
      await AdminPage({
        searchParams: Promise.resolve({ query, page: '2' }),
      })
    );
    expect(last).toContain('26-27 / 27');
    expect(last).toContain('100%_한국 앱 27');
    await sql`delete from apps`;
    expect(renderToStaticMarkup(await AdminPage({ searchParams: Promise.resolve({ query }) }))).toContain(
      '검색 조건에 맞는 앱이 없습니다.'
    );
    await expect(AdminPage({ searchParams: Promise.resolve({ page: '2' }) })).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/admin;307;',
    });
  });
});
