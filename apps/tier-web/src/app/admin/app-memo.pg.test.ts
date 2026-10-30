import { MemoCard } from '@/components/MemoCard';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { updateAppMemo } from './actions';

const databaseUrl = process.env.MEMO_TEST_DATABASE_URL;
const restUrl = process.env.MEMO_TEST_POSTGREST_URL;
const fixture = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock('@/utils/admin', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => fixture.client,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

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
  let synchronizeReads = false;
  let releaseReads: (() => void) | undefined;
  let reads = 0;
  let readBarrier: Promise<void>;

  async function migrate() {
    const journal = JSON.parse(await readFile(new URL('../../../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
    for (const { tag } of journal.entries) {
      await sql.unsafe(await readFile(new URL(`../../../drizzle/${tag}.sql`, import.meta.url), 'utf8'));
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
    const connection = await sql.reserve();
    try {
      await expect(connection.unsafe(migration)).rejects.toMatchObject({
        message: expect.stringContaining('Duplicate app memos'),
      });
    } finally {
      await connection`rollback`;
      connection.release();
    }
    expect(await sql`select * from public.memos order by id`).toEqual(before);
    await sql`delete from public.memos where id = ${before[1].id}`;
    await sql.unsafe(migration);
    expect(await sql`select * from public.memos`).toEqual([before[0]]);
    await expect(sql`insert into public.memos (app_id, content) values (${appId}, 'Duplicate')`).rejects.toMatchObject({
      code: '23505',
    });
  });
});
