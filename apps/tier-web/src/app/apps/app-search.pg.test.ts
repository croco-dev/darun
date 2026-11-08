import { createTierPostgrestFixture } from '@/test-utils/postgrest-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  APPS_SELECT,
  buildAppsSearchFilter,
  getAppsPageRange,
  getHasNextPage,
  normalizeAppsSearchTerm,
} from './app-list';

const databaseUrl = process.env.APP_SEARCH_TEST_DATABASE_URL;
const restUrl = process.env.APP_SEARCH_TEST_POSTGREST_URL;

describe.skipIf(!databaseUrl)('app search through the PostgREST parser and PostgreSQL', () => {
  const database = createTierPostgrestFixture(databaseUrl, restUrl, 'darun_app_search');
  const { sql, client } = database;
  beforeAll(database.prepare);
  afterAll(database.close);

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
    const apps = Array.from({ length: 26 }, (_, index) => ({
      app_store_id: String(index),
      name: `App ${String(index).padStart(2, '0')}`,
      description: 'Hello, world (beta)',
    }));
    await sql`insert into apps ${sql(apps, 'app_store_id', 'name', 'description')}`;
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
