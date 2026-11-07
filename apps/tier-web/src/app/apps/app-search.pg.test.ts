import { assertLocalPostgrestFixture } from '@/test-utils/postgrest-fixture';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  APPS_SELECT,
  buildAppsSearchFilter,
  getAppsPageRange,
  getHasNextPage,
  normalizeAppsSearchTerm,
} from './app-list';

const databaseUrl = process.env.APP_SEARCH_TEST_DATABASE_URL;
const restUrl = process.env.APP_SEARCH_TEST_POSTGREST_URL;

assertLocalPostgrestFixture(databaseUrl, restUrl, 'darun_app_search');

describe.skipIf(!databaseUrl)('app search through the PostgREST parser and PostgreSQL', () => {
  const sql = postgres(databaseUrl!, {
    max: 1,
    onnotice: () => {},
    connection: { statement_timeout: 5000 },
  });
  let ownsTables = false;
  const client = createClient(restUrl ?? 'http://127.0.0.1', 'app-search-fixture-only', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        // This fixture uses PostgREST directly, without Supabase's gateway or auth service.
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
    if (existing.count !== 0) throw new Error('App search tests require an empty dedicated database');
    ownsTables = true;
    const journal = JSON.parse(await readFile(new URL('../../../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
    for (const { tag } of journal.entries) {
      const migration = await readFile(new URL(`../../../drizzle/${tag}.sql`, import.meta.url), 'utf8');
      await sql.unsafe(`${migration};\nCOMMIT;`);
    }
    await sql`notify pgrst, 'reload schema'`;
    const deadline = Date.now() + 5000;
    while (true) {
      const response = await fetch(`${restUrl}/apps?select=id,tiers(tier)`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) break;
      if (Date.now() >= deadline) throw new Error(`PostgREST fixture not ready: ${response.status}`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  afterAll(async () => {
    try {
      if (ownsTables) await sql`drop table if exists memos, tiers, apps, users cascade`;
    } finally {
      await sql.end();
    }
  });

  function search(term: string, page = 1) {
    const { from, to } = getAppsPageRange(page);
    return client
      .from('apps')
      .select(APPS_SELECT, { count: 'exact' })
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .or(buildAppsSearchFilter(normalizeAppsSearchTerm(term)))
      .range(from, to);
  }

  it.each([
    ['Hello, world', 'Hello world'],
    ['Example (beta)', 'Example beta'],
    ['Say "hello"', 'Say hello'],
    ['Path \\ files', 'Path files'],
    ['100% ready', '1000 ready'],
    ['under_score', 'underXscore'],
    ['mix \\"quoted", (value)%_', 'mix quoted valueXX'],
    ['x),name.not.is.null', 'unrelated application'],
  ])('finds literal %s in either field without matching %s', async (term, decoy) => {
    await sql`delete from apps`;
    await sql`insert into apps (app_store_id, name, description) values
      ('name', ${`Prefix ${term} suffix`}, null),
      ('description', 'Description match', ${`Prefix ${term} suffix`}),
      ('both', ${term}, ${term}),
      ('decoy', ${decoy}, ${decoy})`;

    const { data, error, count } = await search(`  ${term}  `);
    expect(error).toBeNull();
    expect(count).toBe(3);
    expect(data?.map(app => app.name).sort()).toEqual(['Description match', `Prefix ${term} suffix`, term].sort());
  });

  it('uses the same literal filter for the exact count and both 24-item pages', async () => {
    await sql`delete from apps`;
    for (let index = 0; index < 26; index++) {
      await sql`insert into apps (app_store_id, name, description)
        values (${String(index)}, ${`App ${String(index).padStart(2, '0')}`}, 'Hello, world (beta)')`;
    }
    await sql`insert into apps (app_store_id, name, description) values ('decoy', 'Unrelated', 'Hello world beta')`;
    const first = await search('Hello, world (beta)');
    const second = await search('Hello, world (beta)', 2);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.count).toBe(26);
    expect(second.count).toBe(26);
    expect(first.data?.map(app => app.name)).toEqual(
      Array.from({ length: 24 }, (_, index) => `App ${String(index).padStart(2, '0')}`)
    );
    expect(second.data?.map(app => app.name)).toEqual(['App 24', 'App 25']);
    expect(getHasNextPage(first.count!, getAppsPageRange(1).to)).toBe(true);
    expect(getHasNextPage(second.count!, getAppsPageRange(2).to)).toBe(false);
  });
});
