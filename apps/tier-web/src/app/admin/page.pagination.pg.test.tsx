import { assertLocalPostgrestFixture } from '@/test-utils/postgrest-fixture';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import AdminPage from './page';

const databaseUrl = process.env.ADMIN_PAGINATION_TEST_DATABASE_URL;
const restUrl = process.env.ADMIN_PAGINATION_TEST_POSTGREST_URL;
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
    global: {
      fetch: (input, init) => {
        const url = new URL(String(input));
        url.pathname = url.pathname.replace(/^\/rest\/v1/, '');
        const headers = new Headers(init?.headers);
        headers.delete('authorization');
        headers.delete('apikey');
        return fetch(url, {
          ...init,
          headers,
          signal: AbortSignal.timeout(5000),
        });
      },
    },
  });

  beforeAll(async () => {
    const [existing] = await sql`select count(*)::integer as count from information_schema.tables
      where table_schema = 'public'`;
    if (existing.count !== 0) throw new Error('Pagination tests require an empty dedicated database');
    ownsTables = true;
    const journal = JSON.parse(await readFile(new URL('../../../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
    for (const { tag } of journal.entries) {
      const migration = await readFile(new URL(`../../../drizzle/${tag}.sql`, import.meta.url), 'utf8');
      await sql.unsafe(`${migration};\nCOMMIT;`);
    }
    await sql`notify pgrst, 'reload schema'`;
    const deadline = Date.now() + 5000;
    while (true) {
      const response = await fetch(`${restUrl}/apps?select=id,tiers(tier),memos(content)`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) break;
      if (Date.now() >= deadline) throw new Error(`PostgREST fixture not ready: ${response.status}`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
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
