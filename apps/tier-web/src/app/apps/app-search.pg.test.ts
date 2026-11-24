import { createTierPostgrestFixture } from '@/test-utils/postgrest-fixture';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fetchAppsPage } from './app-list';

const databaseUrl = process.env.APP_SEARCH_TEST_DATABASE_URL;
const restUrl = process.env.APP_SEARCH_TEST_POSTGREST_URL;

describe.skipIf(!databaseUrl)('public app lists through PostgREST and PostgreSQL', () => {
  let countUnavailable = false;
  const database = createTierPostgrestFixture(databaseUrl, restUrl, 'darun_app_search', async method => {
    if (method === 'HEAD' && countUnavailable) throw new DOMException('Count request unavailable', 'AbortError');
  });
  const { sql, client } = database;
  beforeAll(database.prepare);
  afterAll(database.close);
  beforeEach(async () => {
    await sql`delete from tiers`;
    await sql`delete from apps`;
  });

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
    await sql`insert into apps (app_store_id, name, description) values
      ('name', ${`Prefix ${term} suffix`}, null),
      ('description', 'Description match', ${`Prefix ${term} suffix`}),
      ('both', ${term}, ${term}),
      ('decoy', ${decoy}, ${decoy})`;

    const page = await fetchAppsPage(client, { searchTerm: `  ${term}  ` });
    expect(page.totalCount).toBe(3);
    expect(page.nextCursor).toBeNull();
    expect(page.apps.map(app => app.name).sort()).toEqual(['Description match', `Prefix ${term} suffix`, term].sort());
  });

  it.each(['insert', 'delete'] as const)('continues the full list after an earlier app %s', async mutation => {
    const apps = Array.from({ length: 26 }, (_, index) => ({
      app_store_id: String(index),
      name: `App ${String(index).padStart(2, '0')}`,
    }));
    await sql`insert into apps ${sql(apps, 'app_store_id', 'name')}`;
    const first = await fetchAppsPage(client);
    expect(first.apps.map(app => app.name)).toEqual(apps.slice(0, 24).map(app => app.name));
    expect(first.totalCount).toBe(26);
    if (mutation === 'insert') {
      await sql`insert into apps (app_store_id, name) values ('earlier', 'A new earlier app')`;
    } else {
      await sql`delete from apps where id = ${first.apps[0].id}`;
    }

    const second = await fetchAppsPage(client, { after: first.nextCursor });
    expect(second.apps.map(app => app.name)).toEqual(['App 24', 'App 25']);
    expect(second.totalCount).toBe(mutation === 'insert' ? 27 : 25);
    expect(second.nextCursor).toBeNull();
  });

  it('returns the next page when the separate count request fails', async () => {
    await sql`insert into apps (app_store_id, name)
      select i::text, 'App ' || lpad(i::text, 2, '0') from generate_series(0, 48) i`;
    const first = await fetchAppsPage(client);
    countUnavailable = true;
    try {
      const second = await fetchAppsPage(client, { after: first.nextCursor });
      expect(second.apps.map(app => app.name)).toEqual(Array.from({ length: 24 }, (_, i) => `App ${i + 24}`));
      expect(second.totalCount).toBeNull();
      expect(second.nextCursor?.name).toBe('App 47');

      const third = await fetchAppsPage(client, { after: second.nextCursor });
      expect(third.apps.map(app => app.name)).toEqual(['App 48']);
      expect(third.nextCursor).toBeNull();
    } finally {
      countUnavailable = false;
    }
  });

  it('combines literal search with a quoted, tied name and ID boundary', async () => {
    const name = 'App \\"beta", (test)%_';
    const id = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
    const apps = Array.from({ length: 26 }, (_, index) => ({
      id: id(index),
      app_store_id: String(index),
      name,
    })).reverse();
    await sql`insert into apps ${sql(apps, 'id', 'app_store_id', 'name')}`;
    await sql`insert into apps (app_store_id, name) values ('decoy', 'Z unrelated after the boundary')`;

    const searchTerm = '\\"beta", (test)%_';
    const first = await fetchAppsPage(client, { searchTerm });
    expect(first.apps.map(app => app.id)).toEqual(Array.from({ length: 24 }, (_, index) => id(index)));
    expect(first.totalCount).toBe(26);
    expect(first.nextCursor).toEqual({ name, id: id(23) });
    const second = await fetchAppsPage(client, {
      searchTerm,
      after: first.nextCursor,
    });
    expect(second.apps.map(app => app.id)).toEqual([id(24), id(25)]);
    expect(second.totalCount).toBe(26);
    expect(second.nextCursor).toBeNull();
  });

  it.each([0, 1])('continues tier %s after an earlier app leaves it', async tier => {
    const apps = Array.from({ length: 26 }, (_, index) => ({
      app_store_id: String(index),
      name: `Tier fixture ${String(index).padStart(2, '0')}`,
    }));
    const [user] = await sql`insert into users (email) values ('tier@example.test')
      on conflict (email) do update set email = excluded.email returning id`;
    await sql`insert into apps ${sql(apps, 'app_store_id', 'name')}`;
    if (tier === 1) {
      await sql`insert into tiers (app_id, assigned_by, tier) select id, ${user.id}, 1 from apps`;
    } else {
      await sql`insert into tiers (app_id, assigned_by, tier) select id, ${user.id}, 0
        from apps where app_store_id in ('0', '24')`;
    }

    const first = await fetchAppsPage(client, { tier });
    expect(first.apps.map(app => app.name)).toEqual(apps.slice(0, 24).map(app => app.name));
    expect(first.totalCount).toBe(26);
    await sql`update tiers set tier = 2 where app_id = ${first.apps[0].id}`;

    const second = await fetchAppsPage(client, {
      tier,
      after: first.nextCursor,
    });
    expect(second.apps.map(app => app.name)).toEqual(['Tier fixture 24', 'Tier fixture 25']);
    expect(second.apps.map(app => app.tier)).toEqual([tier, tier]);
    expect(second.totalCount).toBe(25);
    expect(second.nextCursor).toBeNull();
  });
});
