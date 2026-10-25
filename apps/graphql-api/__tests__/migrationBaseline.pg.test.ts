import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

const databaseUrl = process.env['MIGRATION_BASELINE_TEST_DATABASE_URL'];
const appDir = join(__dirname, '..');
const migrationsDir = join(appDir, 'scripts', 'migrations');
const journal = JSON.parse(readFileSync(join(migrationsDir, 'meta', '_journal.json'), 'utf8')) as {
  entries: { tag: string; when: number }[];
};
const first = journal.entries[0]!;
const initialSql = readFileSync(join(migrationsDir, `${first.tag}.sql`), 'utf8');

async function withDatabase(run: (sql: postgres.Sql, url: string) => Promise<void>) {
  if (!databaseUrl) throw new Error('MIGRATION_BASELINE_TEST_DATABASE_URL required');
  const url = new URL(databaseUrl);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/darun_migration_baseline') {
    throw new Error('Use a dedicated local darun_migration_baseline database');
  }
  const admin = postgres(databaseUrl, { max: 1 });
  const name = `baseline_${randomUUID().replaceAll('-', '')}`;
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  url.pathname = `/${name}`;
  const sql = postgres(url.toString(), { max: 1 });
  try {
    await run(sql, url.toString());
  } finally {
    await sql.end();
    await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
  }
}

function migrate(url: string, ...args: string[]) {
  const result = spawnSync(process.execPath, [require.resolve('tsx/cli'), 'scripts/migrate.ts', ...args], {
    cwd: appDir,
    env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: url },
    encoding: 'utf8',
    timeout: 30_000,
  });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}

async function records(sql: postgres.Sql) {
  const [table] = await sql`SELECT to_regclass('drizzle.__drizzle_migrations') AS name`;
  return table?.['name']
    ? await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`
    : [];
}

// Each case owns a fresh database; it never truncates or changes the supplied database.
describe.skipIf(!databaseUrl)('legacy migration baseline (isolated PostgreSQL)', { timeout: 60_000 }, () => {
  it('profiles만 있는 DB는 일반 실행과 명시적 baseline 모두 이력을 기록하지 않는다', async () => {
    await withDatabase(async (sql, url) => {
      await sql.unsafe('CREATE TABLE profiles (id text PRIMARY KEY)');
      for (const args of [[], ['--baseline-initial']]) {
        const result = migrate(url, ...args);
        expect(result.status, result.output).not.toBe(0);
        expect(await records(sql), result.output).toEqual([]);
      }
    });
  });

  it('완전한 legacy DB도 명시적 요청 없이 baseline하지 않으며 요청 후 후속 SQL을 적용한다', async () => {
    await withDatabase(async (sql, url) => {
      await sql.unsafe(initialSql);
      await sql`INSERT INTO profiles (id, user_id, display_name) VALUES ('profile_before', 'user_before', 'Before')`;
      const automatic = migrate(url);
      expect(automatic.status, automatic.output).not.toBe(0);
      expect(await records(sql)).toEqual([]);
      const baseline = migrate(url, '--baseline-initial');
      expect(baseline.status, baseline.output).toBe(0);
      expect((await records(sql)).map(row => Number(row['created_at']))).toEqual(journal.entries.map(e => e.when));
      expect(await sql`SELECT display_name FROM profiles WHERE id = 'profile_before'`).toEqual([
        { display_name: 'Before' },
      ]);
      const before = await records(sql);
      const again = migrate(url);
      expect(again.status, again.output).toBe(0);
      expect(await records(sql)).toEqual(before);
      const duplicate = migrate(url, '--baseline-initial');
      expect(duplicate.status, duplicate.output).not.toBe(0);
      expect(await records(sql)).toEqual(before);
    });
  });

  it('빈 DB는 초기 SQL부터 적용하고 두 번째 실행에서 이력을 보존한다', async () => {
    await withDatabase(async (sql, url) => {
      const result = migrate(url);
      expect(result.status, result.output).toBe(0);
      expect((await records(sql)).map(row => Number(row['created_at']))).toEqual(journal.entries.map(e => e.when));
      const before = await records(sql);
      const again = migrate(url);
      expect(again.status, again.output).toBe(0);
      expect(await records(sql)).toEqual(before);
    });
  });

  it('빈 DB의 baseline과 알 수 없는 옵션은 아무 이력도 만들지 않는다', async () => {
    await withDatabase(async (sql, url) => {
      for (const args of [['--baseline-initial'], ['--baseline-typo']]) {
        const result = migrate(url, ...args);
        expect(result.status, result.output).not.toBe(0);
        expect(await records(sql)).toEqual([]);
      }
    });
  });

  it('public의 동명 함수 대신 PostgreSQL catalog 함수로 구조를 확인한다', async () => {
    await withDatabase(async (sql, url) => {
      await sql.unsafe(initialSql);
      await sql.unsafe(
        "CREATE FUNCTION public.format_type(oid, integer) RETURNS text LANGUAGE sql AS $$ SELECT 'unexpected_type'::text $$"
      );
      const result = migrate(url, '--baseline-initial');
      expect(result.status, result.output).toBe(0);
      expect((await records(sql)).map(row => Number(row['created_at']))).toEqual(journal.entries.map(e => e.when));
    });
  });

  it.each([
    ['table', 'DROP TABLE companies', 'companies'],
    ['column', 'ALTER TABLE profiles DROP COLUMN display_name', 'profiles.display_name'],
    ['type', 'ALTER TABLE profiles ALTER COLUMN user_id TYPE varchar(12)', 'profiles.user_id'],
    ['nullable', 'ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL', 'profiles.user_id'],
    ['default', 'ALTER TABLE profiles ALTER COLUMN created_at DROP DEFAULT', 'profiles.created_at'],
    [
      'different default function',
      "CREATE FUNCTION public.now() RETURNS timestamp LANGUAGE sql AS $$ SELECT timestamp '2001-01-01' $$; ALTER TABLE profiles ALTER COLUMN created_at SET DEFAULT public.now()",
      'profiles.created_at',
    ],
    ['primary key', 'ALTER TABLE profiles DROP CONSTRAINT profiles_pkey', 'profiles'],
    ['unique', 'ALTER TABLE tags DROP CONSTRAINT tags_name_unique', 'tags'],
    ['foreign key', 'ALTER TABLE product_tags DROP CONSTRAINT product_tags_tag_id_tags_id_fk', 'product_tags'],
    [
      'unvalidated foreign key',
      'ALTER TABLE product_tags DROP CONSTRAINT product_tags_tag_id_tags_id_fk; ALTER TABLE product_tags ADD CONSTRAINT product_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES tags(id) NOT VALID',
      'product_tags',
    ],
    [
      'foreign key target identity',
      'CREATE TABLE "Tags" (id varchar(26) PRIMARY KEY); ALTER TABLE product_tags DROP CONSTRAINT product_tags_tag_id_tags_id_fk; ALTER TABLE product_tags ADD CONSTRAINT product_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES "Tags"(id)',
      'product_tags',
    ],
    ['index', 'DROP INDEX unique_translation', 'unique_translation'],
    ['index shape', 'DROP INDEX votes_count_idx; CREATE INDEX votes_count_idx ON votes (count ASC)', 'votes_count_idx'],
  ])('%s 불일치를 진단하고 baseline 이력을 남기지 않는다', async (_label, change, diagnostic) => {
    await withDatabase(async (sql, url) => {
      await sql.unsafe(initialSql);
      await sql.unsafe(change);
      const result = migrate(url, '--baseline-initial');
      expect(result.status, result.output).not.toBe(0);
      expect(result.output).toContain(diagnostic);
      expect(await records(sql)).toEqual([]);
    });
  });
});
