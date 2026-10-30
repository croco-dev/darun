import { MemoCard } from '@/components/MemoCard';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate as migrateDrizzle } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { updateAppMemo } from './actions';
import AdminPage from './page';

const databaseUrl = process.env.MEMO_TEST_DATABASE_URL;
const restUrl = process.env.MEMO_TEST_POSTGREST_URL;
const fixture = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock('@/utils/admin', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => fixture.client,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/components/admin/DeleteAppButton', () => ({ DeleteAppButton: () => null }));
vi.mock('./AdminSearchInput', () => ({ AdminSearchInput: () => null }));
vi.mock('./AppStoreScrapeForm', () => ({ AppStoreScrapeForm: () => null }));
vi.mock('./TierSelect', () => ({ TierSelect: () => null }));

if (databaseUrl || restUrl) {
  if (!databaseUrl || !restUrl) throw new Error('Memo tests require both database and PostgREST URLs');
  const db = new URL(databaseUrl);
  const rest = new URL(restUrl);
  if (
    !['localhost', '127.0.0.1'].includes(db.hostname) ||
    db.pathname !== '/darun_memo_integrity' ||
    !['localhost', '127.0.0.1'].includes(rest.hostname) ||
    rest.protocol !== 'http:'
  ) {
    throw new Error('Memo tests require dedicated local PostgreSQL and PostgREST fixtures');
  }
}

describe.skipIf(!databaseUrl)('app memo actions with PostgreSQL and PostgREST', () => {
  const sql = postgres(databaseUrl!, {
    max: 1,
    onnotice: () => {},
    connection: { statement_timeout: 5000 },
  });
  const appId = '00000000-0000-0000-0000-000000000463';
  let ownsTables = false;
  let ownsJournalSchema = false;
  let synchronizeReads = false;
  let releaseReads: (() => void) | undefined;
  let reads = 0;
  let readBarrier: Promise<void>;

  async function migrate() {
    const journal = JSON.parse(await readFile(new URL('../../../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
    for (const { tag } of journal.entries) {
      const migration = await readFile(new URL(`../../../drizzle/${tag}.sql`, import.meta.url), 'utf8');
      await sql.begin(transaction => transaction.unsafe(migration));
    }
  }

  beforeAll(async () => {
    const [existing] = await sql`select count(*)::integer as count from information_schema.tables
      where table_schema = 'public'`;
    if (existing.count !== 0) throw new Error('Memo tests require an empty dedicated database');
    ownsTables = true;
    await migrate();
    await sql`notify pgrst, 'reload schema'`;
    const deadline = Date.now() + 5000;
    while (true) {
      const response = await fetch(`${restUrl}/memos?select=id`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) break;
      if (Date.now() >= deadline) throw new Error(`PostgREST fixture not ready: ${response.status}`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    fixture.client = createSupabaseClient(restUrl!, 'memo-fixture-only', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          // The disposable PostgREST fixture has no Supabase gateway or authentication.
          const url = new URL(String(input));
          url.pathname = url.pathname.replace(/^\/rest\/v1/, '');
          const headers = new Headers(init?.headers);
          headers.delete('authorization');
          headers.delete('apikey');
          const response = await fetch(url, {
            ...init,
            headers,
            signal: AbortSignal.timeout(5000),
          });
          if (synchronizeReads && (init?.method ?? 'GET') === 'GET') {
            if (++reads === 2) releaseReads?.();
            await readBarrier;
          }
          return response;
        },
      },
    });
  });

  beforeEach(async () => {
    if (ownsJournalSchema) {
      await sql`drop schema memo_test_migrations cascade`;
      ownsJournalSchema = false;
    }
    synchronizeReads = false;
    reads = 0;
    readBarrier = new Promise(resolve => {
      releaseReads = resolve;
    });
    await sql`truncate public.apps cascade`;
    await sql`insert into public.apps (id, app_store_id, name) values (${appId}, 'id463', 'Memo app')`;
  });

  afterAll(async () => {
    releaseReads?.();
    try {
      if (ownsJournalSchema) await sql`drop schema memo_test_migrations cascade`;
      if (ownsTables) await sql`drop table public.memos, public.tiers, public.apps, public.users cascade`;
    } finally {
      await sql.end();
    }
  });

  it('concurrent first saves leave one editable, visible and deletable memo', async () => {
    synchronizeReads = true;
    try {
      await Promise.all([updateAppMemo(appId, ' First writer '), updateAppMemo(appId, ' Second writer ')]);
    } finally {
      synchronizeReads = false;
      releaseReads?.();
    }
    const rows = await sql`select id, content from public.memos where app_id = ${appId}`;
    expect(rows).toHaveLength(1);
    expect(['First writer', 'Second writer']).toContain(rows[0].content);
    expect(renderToStaticMarkup(await MemoCard({ appId }))).toContain(rows[0].content);

    await updateAppMemo(appId, ' Updated memo\nSecond line ');
    expect(await sql`select id, content from public.memos where app_id = ${appId}`).toEqual([
      { id: rows[0].id, content: 'Updated memo\nSecond line' },
    ]);
    expect(renderToStaticMarkup(await MemoCard({ appId }))).toContain('Updated memo\nSecond line');
    await updateAppMemo(appId, ' \n ');
    expect(await sql`select * from public.memos where app_id = ${appId}`).toHaveLength(0);
    expect(await MemoCard({ appId })).toBeNull();
    await updateAppMemo(appId, '');
    expect(await sql`select * from public.memos`).toHaveLength(0);
  });

  it('the migration rejects historical duplicates without changing their contents', async () => {
    await sql`alter table public.memos drop constraint if exists memos_app_id_unique`;
    await sql`insert into public.memos (app_id, content) values (${appId}, 'Keep A'), (${appId}, 'Keep B')`;
    const before = await sql`select * from public.memos order by id`;
    const migration = await readFile(new URL('../../../drizzle/0003_atomic_memos.sql', import.meta.url), 'utf8');
    await expect(sql.begin(transaction => transaction.unsafe(migration))).rejects.toMatchObject({
      message: expect.stringContaining('Duplicate app memos'),
    });
    expect(await sql`select * from public.memos order by id`).toEqual(before);
    await sql`delete from public.memos where id = ${before[1].id}`;
    await sql.begin(transaction => transaction.unsafe(migration));
    expect(await sql`select * from public.memos`).toEqual([before[0]]);
    await expect(sql`insert into public.memos (app_id, content) values (${appId}, 'Duplicate')`).rejects.toMatchObject({
      code: '23505',
    });
  });

  it('carries the actual apps memo embed into the editor after reload, edit and deletion', async () => {
    const client = fixture.client as ReturnType<typeof createSupabaseClient>;
    const editorValue = async () => {
      const markup = renderToStaticMarkup(await AdminPage({ searchParams: Promise.resolve({}) }));
      return markup.match(/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/)?.[1];
    };
    await updateAppMemo(appId, 'Existing memo\nSecond line');
    const { data, error } = await client
      .from('apps')
      .select('id,memos(content)')
      .eq('id', appId)
      .single()
      .overrideTypes<{ memos: unknown }, { merge: false }>();
    expect(error).toBeNull();
    expect(data?.memos).toEqual({ content: 'Existing memo\nSecond line' });
    expect(await editorValue()).toBe('Existing memo\nSecond line');
    await updateAppMemo(appId, 'Edited memo');
    expect(await editorValue()).toBe('Edited memo');
    await updateAppMemo(appId, '');
    expect(await editorValue()).toBe('');
  });

  it.each([false, true])('rolls back a failed journal write and retries (fresh database: %s)', async fresh => {
    await sql`alter table public.memos drop constraint memos_app_id_unique`;
    if (fresh) await sql`drop table public.memos, public.tiers, public.apps, public.users cascade`;
    const [schema] = await sql`select to_regnamespace('memo_test_migrations') as name`;
    if (schema.name !== null) throw new Error('Memo migration journal fixture already exists');
    await sql`create schema memo_test_migrations`;
    ownsJournalSchema = true;
    await sql`create table memo_test_migrations.__drizzle_migrations
      (id serial primary key, hash text not null, created_at bigint)`;
    const migrationsFolder = new URL('../../../drizzle/', import.meta.url).pathname;
    const migrations = readMigrationFiles({ migrationsFolder });
    for (const migration of fresh ? [] : migrations.slice(0, -1)) {
      await sql`insert into memo_test_migrations.__drizzle_migrations (hash, created_at)
        values (${migration.hash}, ${migration.folderMillis})`;
    }
    const before = await sql`select * from memo_test_migrations.__drizzle_migrations order by id`;
    await sql.unsafe(`create function memo_test_migrations.reject_journal() returns trigger language plpgsql as $$
      begin if new.created_at = ${migrations.at(-1)!.folderMillis} then
        raise exception 'injected journal write failure'; end if; return new; end $$`);
    await sql`create trigger reject_journal before insert on memo_test_migrations.__drizzle_migrations
      for each row execute function memo_test_migrations.reject_journal()`;
    const apply = () => migrateDrizzle(drizzle(sql), { migrationsFolder, migrationsSchema: 'memo_test_migrations' });
    await expect(apply()).rejects.toThrow();
    const prefix = migrations
      .slice(0, -1)
      .map(({ hash, folderMillis }) => ({ hash, created_at: String(folderMillis) }));
    expect(await sql`select hash, created_at from memo_test_migrations.__drizzle_migrations order by id`).toEqual(
      prefix
    );
    if (!fresh) expect(await sql`select * from memo_test_migrations.__drizzle_migrations order by id`).toEqual(before);
    expect(
      await sql`select conname from pg_constraint where conrelid = 'public.memos'::regclass
      and conname = 'memos_app_id_unique'`
    ).toHaveLength(0);
    await sql`drop trigger reject_journal on memo_test_migrations.__drizzle_migrations`;
    await apply();
    expect(
      await sql`select conname from pg_constraint where conrelid = 'public.memos'::regclass
      and conname = 'memos_app_id_unique'`
    ).toHaveLength(1);
    expect(await sql`select hash, created_at from memo_test_migrations.__drizzle_migrations order by id`).toEqual([
      ...prefix,
      { hash: migrations.at(-1)!.hash, created_at: String(migrations.at(-1)!.folderMillis) },
    ]);
    await apply();
    expect(await sql`select * from memo_test_migrations.__drizzle_migrations`).toHaveLength(migrations.length);
  });
});
