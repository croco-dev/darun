import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const databaseUrl = process.env.DEDUPE_TEST_DATABASE_URL;
const execute = promisify(execFile);
const appDirectory = fileURLToPath(new URL('../', import.meta.url));

describe.skipIf(!databaseUrl)('duplicate cleanup CLI with isolated PostgreSQL', () => {
  const sql = postgres(databaseUrl!, { max: 1, onnotice: () => {} });
  const first = '00000000-0000-0000-0000-000000000001';
  const second = '00000000-0000-0000-0000-000000000002';
  const user = '00000000-0000-0000-0000-000000000003';
  let ownsFixtureTables = false;

  async function run(...args: string[]) {
    return execute(process.execPath, ['--import', 'tsx', 'scripts/remove-duplicates.ts', ...args], {
      cwd: appDirectory,
      env: { NODE_ENV: 'test', PATH: process.env.PATH, DATABASE_URL: databaseUrl },
      timeout: 15000,
    });
  }

  async function snapshot() {
    return {
      apps: await sql`select * from apps order by id`,
      tiers: await sql`select * from tiers order by id`,
      memos: await sql`select * from memos order by id`,
    };
  }

  beforeAll(async () => {
    const [existing] = await sql`select count(*)::integer as count from information_schema.tables
      where table_schema = 'public' and table_name in ('apps', 'tiers', 'memos', 'users')`;
    if (existing.count !== 0) throw new Error('Duplicate cleanup tests require an empty dedicated database');
    ownsFixtureTables = true;
    for (const file of ['0000_careless_leech.sql', '0001_orange_queen_noir.sql', '0002_atomic_tiers.sql']) {
      await sql.unsafe(await readFile(new URL(`../drizzle/${file}`, import.meta.url), 'utf8'));
    }
    await sql`insert into users (id, email) values (${user}, 'dedupe@example.invalid')`;
  });

  beforeEach(async () => {
    await sql`truncate apps cascade`;
    await sql`insert into apps (id, app_store_id, name) values
      (${first}, 'id123?source=old', 'Tier app'), (${second}, 'id123', 'Memo app')`;
    await sql`insert into tiers (app_id, assigned_by, tier, notes) values (${first}, ${user}, 2, 'classification')`;
    await sql`insert into memos (app_id, content) values (${second}, 'unique memo')`;
  });

  afterAll(async () => {
    try {
      if (ownsFixtureTables) await sql`drop table if exists memos, tiers, apps, users cascade`;
    } finally {
      await sql.end();
    }
  });

  it('defaults to a dry run and reports the winner and memo transfer without writes', async () => {
    const before = await snapshot();
    const { stdout } = await run();
    expect(await snapshot()).toEqual(before);
    expect(stdout).toContain(first);
    expect(stdout).toContain('dry-run');
    expect(stdout).toContain('unique memo');
    expect(stdout).toContain(second);
  });

  it('preserves the complementary tier and memo, normalizes the ID, and is idempotent', async () => {
    const before = await snapshot();
    await run('--apply');
    const after = await snapshot();
    expect(after.apps).toEqual([{ ...before.apps[0], app_store_id: 'id123' }]);
    expect(after.tiers).toEqual(before.tiers);
    expect(after.memos).toEqual([{ ...before.memos[0], app_id: first }]);
    await run('--apply');
    expect(await snapshot()).toEqual(after);
  });

  it('transfers an explicit unassigned tier without changing its identity or notes', async () => {
    await sql`delete from tiers`;
    await sql`insert into tiers (app_id, assigned_by, tier, notes) values (${second}, ${user}, 0, 'unassigned')`;
    await sql`insert into memos (app_id, content) values (${first}, 'unique memo')`;
    await sql`update apps set created_at = '2020-01-01' where id = ${second}`;
    const before = await snapshot();
    await run('--apply');
    const after = await snapshot();
    expect(after.tiers).toEqual([{ ...before.tiers[0], app_id: first }]);
    expect(after.apps.map(row => row.id)).toEqual([first]);
  });

  it('keeps a conflicting group intact while normalizing an unrelated sole app', async () => {
    await sql`insert into memos (app_id, content) values (${first}, 'different memo')`;
    await sql`insert into apps (app_store_id, name) values ('id456?source=other', 'Sole app')`;
    const before = await snapshot();
    const { stdout } = await run('--apply');
    const after = await snapshot();
    expect(after.apps.filter(row => row.id === first || row.id === second)).toEqual(
      before.apps.filter(row => row.id === first || row.id === second)
    );
    expect(after.tiers).toEqual(before.tiers);
    expect(after.memos).toEqual(before.memos);
    expect(after.apps.find(row => row.name === 'Sole app')?.app_store_id).toBe('id456');
    expect(
      JSON.parse(stdout)
        .groups.map((group: { status: string }) => group.status)
        .sort()
    ).toEqual(['applied', 'conflict']);
  });

  it('serializes concurrent cleanup runs to the same preserved final state', async () => {
    const before = await snapshot();
    await Promise.all([run('--apply'), run('--apply')]);
    const after = await snapshot();
    expect(after.apps).toEqual([{ ...before.apps[0], app_store_id: 'id123' }]);
    expect(after.tiers).toEqual(before.tiers);
    expect(after.memos).toEqual([{ ...before.memos[0], app_id: first }]);
  });

  it('rolls back when a deferred constraint fails at commit', async () => {
    const before = await snapshot();
    await sql.unsafe(
      `create function reject_commit() returns trigger language plpgsql as $$ begin raise exception 'injected commit failure'; end $$`
    );
    await sql.unsafe(
      `create constraint trigger reject_commit after update on apps deferrable initially deferred for each row execute function reject_commit()`
    );
    try {
      await expect(run('--apply')).rejects.toThrow();
      expect(await snapshot()).toEqual(before);
    } finally {
      await sql`drop trigger reject_commit on apps`;
      await sql`drop function reject_commit()`;
    }
  });

  it.each(['memo', 'tier', 'tier notes', 'tier author'])(
    'refuses a conflicting %s group unchanged and reports both values',
    async kind => {
      if (kind === 'memo') {
        await sql`insert into memos (app_id, content) values (${first}, 'different memo')`;
      } else {
        if (kind === 'tier author') {
          await sql`insert into users (id, email) values ('00000000-0000-0000-0000-000000000004', 'other@example.invalid') on conflict do nothing`;
        }
        await sql`insert into tiers (app_id, assigned_by, tier, notes) values (
        ${second}, ${kind === 'tier author' ? '00000000-0000-0000-0000-000000000004' : user},
        ${kind === 'tier' ? 3 : 2}, ${kind === 'tier notes' ? 'other classification' : 'classification'})`;
      }
      const before = await snapshot();
      const { stdout } = await run('--apply');
      expect(await snapshot()).toEqual(before);
      expect(stdout).toContain('conflict');
      expect(stdout).toContain(first);
      expect(stdout).toContain(second);
      expect(stdout).toContain(kind === 'memo' ? 'different memo' : 'classification');
      expect(stdout).toContain(
        kind === 'memo'
          ? 'unique memo'
          : kind === 'tier'
            ? '3'
            : kind === 'tier notes'
              ? 'other classification'
              : '00000000-0000-0000-0000-000000000004'
      );
    }
  );

  it('deduplicates identical content while preserving the winner rows and their metadata', async () => {
    await sql`insert into memos (app_id, content) values (${first}, 'unique memo')`;
    await sql`insert into tiers (app_id, assigned_by, tier, notes) values (${second}, ${user}, 2, 'classification')`;
    await sql`update apps set created_at = '2020-01-01' where id = ${second}`;
    const before = await snapshot();
    await run('--apply');
    const after = await snapshot();
    expect(after.apps).toHaveLength(1);
    expect(after.apps[0].id).toBe(first);
    expect(after.tiers).toEqual(before.tiers.filter(row => row.app_id === first));
    expect(after.memos).toEqual(before.memos.filter(row => row.app_id === first));
  });

  it.each([
    ['tiers', 'DELETE'],
    ['tiers', 'UPDATE'],
    ['memos', 'DELETE'],
    ['memos', 'UPDATE'],
    ['apps', 'DELETE'],
    ['apps', 'UPDATE'],
  ])('rolls back every write when %s %s fails', async (table, operation) => {
    if (table === 'tiers' && operation === 'UPDATE') {
      await sql`delete from tiers`;
      await sql`insert into tiers (app_id, assigned_by, tier, notes) values (${second}, ${user}, 0, 'unassigned')`;
      await sql`insert into memos (app_id, content) values (${first}, 'unique memo')`;
    } else if (!(table === 'memos' && operation === 'UPDATE')) {
      await sql`insert into tiers (app_id, assigned_by, tier, notes) values (${second}, ${user}, 2, 'classification')`;
      await sql`insert into memos (app_id, content) values (${first}, 'unique memo')`;
    }
    await sql`update apps set created_at = '2020-01-01' where id = ${second}`;
    const before = await snapshot();
    await sql.unsafe(
      `create or replace function reject_cleanup() returns trigger language plpgsql as $$ begin raise exception 'injected cleanup failure'; end $$`
    );
    await sql.unsafe(
      `create trigger reject_cleanup before ${operation} on ${table} for each row execute function reject_cleanup()`
    );
    try {
      await expect(run('--apply')).rejects.toThrow();
      expect(await snapshot()).toEqual(before);
    } finally {
      await sql.unsafe(`drop trigger reject_cleanup on ${table}`);
      await sql`drop function reject_cleanup()`;
    }
  });

  it('rejects unknown flags before changing data', async () => {
    const before = await snapshot();
    await expect(run('--aply')).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  });
});
