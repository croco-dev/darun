import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
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

function migrateScript(script: string, url: string, ...args: string[]) {
  const result = spawnSync(process.execPath, [require.resolve('tsx/cli'), script, ...args], {
    cwd: appDir,
    env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: url },
    encoding: 'utf8',
    timeout: 30_000,
  });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}

function migrate(url: string, ...args: string[]) {
  return migrateScript(join(appDir, 'scripts', 'migrate.ts'), url, ...args);
}

async function withMigrationCopy(run: (folder: string, script: string) => Promise<void>) {
  const root = mkdtempSync(join(tmpdir(), 'darun-migration-history-'));
  try {
    symlinkSync(join(appDir, 'node_modules'), join(root, 'node_modules'), 'dir');
    const scripts = join(root, 'scripts');
    cpSync(join(appDir, 'scripts'), scripts, { recursive: true });
    await run(join(scripts, 'migrations'), join(scripts, 'migrate.ts'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function appendPending(folder: string) {
  const path = join(folder, 'meta', '_journal.json');
  const copy = JSON.parse(readFileSync(path, 'utf8'));
  const previous = copy.entries.at(-1);
  const entry = { ...previous, idx: previous.idx + 1, when: previous.when + 1, tag: '9999_history_probe' };
  copy.entries.push(entry);
  writeFileSync(path, JSON.stringify(copy));
  writeFileSync(join(folder, `${entry.tag}.sql`), 'CREATE TABLE history_probe (id integer);');
  return entry;
}

async function records(sql: postgres.Sql) {
  const [table] = await sql`SELECT to_regclass('drizzle.__drizzle_migrations') AS name`;
  return table?.['name']
    ? await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`
    : [];
}

// Each case owns a fresh database; it never truncates or changes the supplied database.
describe.skipIf(!databaseUrl)('legacy migration baseline (isolated PostgreSQL)', { timeout: 60_000 }, () => {
  it('적용된 SQL 한 글자가 바뀌면 후속 SQL과 이력을 변경 전에 거절한다', async () => {
    await withDatabase(async (sql, url) => {
      await withMigrationCopy(async (folder, script) => {
        const installed = migrateScript(script, url);
        expect(installed.status, installed.output).toBe(0);
        const before = await records(sql);
        const path = join(folder, `${first.tag}.sql`);
        writeFileSync(path, readFileSync(path, 'utf8') + ' ');
        appendPending(folder);
        const result = migrateScript(script, url);
        expect(result.status, result.output).not.toBe(0);
        expect(result.output).toContain(first.tag);
        expect(result.output).not.toContain(url);
        expect(await records(sql)).toEqual(before);
        expect(await sql`SELECT to_regclass('public.history_probe') AS name`).toEqual([{ name: null }]);
      });
    });
  });

  it('기존 hash가 맞으면 새 migration을 적용하고 재실행은 같은 이력을 보존한다', async () => {
    await withDatabase(async (sql, url) => {
      await withMigrationCopy(async (folder, script) => {
        const installed = migrateScript(script, url);
        expect(installed.status, installed.output).toBe(0);
        const before = await records(sql);
        const pending = appendPending(folder);
        const result = migrateScript(script, url);
        expect(result.status, result.output).toBe(0);
        const after = await records(sql);
        expect(after.slice(0, -1)).toEqual(before);
        expect(Number(after.at(-1)?.['created_at'])).toBe(pending.when);
        expect(await sql`SELECT to_regclass('public.history_probe') AS name`).toEqual([{ name: 'history_probe' }]);
        const again = migrateScript(script, url);
        expect(again.status, again.output).toBe(0);
        expect(await records(sql)).toEqual(after);
      });
    });
  });

  it.each(['duplicate', 'unknown', 'null', 'gap'] as const)(
    '%s 적용 이력은 새 SQL과 baseline 기록 전에 거절한다',
    async kind => {
      await withDatabase(async (sql, url) => {
        await withMigrationCopy(async (folder, script) => {
          const installed = migrateScript(script, url);
          expect(installed.status, installed.output).toBe(0);
          if (kind === 'duplicate') {
            await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            SELECT hash, created_at FROM drizzle.__drizzle_migrations WHERE created_at = ${first.when}`;
          } else if (kind === 'gap') {
            await sql`DELETE FROM drizzle.__drizzle_migrations WHERE created_at = ${journal.entries[1]!.when}`;
          } else {
            await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES ('untrusted-history-marker', ${kind === 'null' ? null : first.when - 1})`;
          }
          const before = await records(sql);
          appendPending(folder);
          for (const args of [[], ['--baseline-initial']]) {
            const result = migrateScript(script, url, ...args);
            expect(result.status, result.output).not.toBe(0);
            expect(result.output).not.toContain('untrusted-history-marker');
            expect(result.output).not.toContain(url);
            expect(await records(sql)).toEqual(before);
            expect(await sql`SELECT to_regclass('public.history_probe') AS name`).toEqual([{ name: null }]);
          }
        });
      });
    }
  );

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
    { label: 'table', change: 'DROP TABLE companies', diagnostic: 'companies' },
    { label: 'column', change: 'ALTER TABLE profiles DROP COLUMN display_name', diagnostic: 'profiles.display_name' },
    {
      label: 'type',
      change: 'ALTER TABLE profiles ALTER COLUMN user_id TYPE varchar(12)',
      diagnostic: 'profiles.user_id',
    },
    {
      label: 'nullable',
      change: 'ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL',
      diagnostic: 'profiles.user_id',
    },
    {
      label: 'default',
      change: 'ALTER TABLE profiles ALTER COLUMN created_at DROP DEFAULT',
      diagnostic: 'profiles.created_at',
    },
    {
      label: 'different default function',
      change:
        "CREATE FUNCTION public.now() RETURNS timestamp LANGUAGE sql AS $$ SELECT timestamp '2001-01-01' $$; ALTER TABLE profiles ALTER COLUMN created_at SET DEFAULT public.now()",
      diagnostic: 'profiles.created_at',
    },
    { label: 'primary key', change: 'ALTER TABLE profiles DROP CONSTRAINT profiles_pkey', diagnostic: 'profiles' },
    { label: 'unique', change: 'ALTER TABLE tags DROP CONSTRAINT tags_name_unique', diagnostic: 'tags' },
    {
      label: 'foreign key',
      change: 'ALTER TABLE product_tags DROP CONSTRAINT product_tags_tag_id_tags_id_fk',
      diagnostic: 'product_tags',
    },
    {
      label: 'unvalidated foreign key',
      change:
        'ALTER TABLE product_tags DROP CONSTRAINT product_tags_tag_id_tags_id_fk; ALTER TABLE product_tags ADD CONSTRAINT product_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES tags(id) NOT VALID',
      diagnostic: 'product_tags',
    },
    {
      label: 'foreign key target identity',
      change:
        'CREATE TABLE "Tags" (id varchar(26) PRIMARY KEY); ALTER TABLE product_tags DROP CONSTRAINT product_tags_tag_id_tags_id_fk; ALTER TABLE product_tags ADD CONSTRAINT product_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES "Tags"(id)',
      diagnostic: 'product_tags',
    },
    {
      label: 'quoted-dot foreign key target',
      change:
        'CREATE TABLE "public.tags" (id varchar(26) PRIMARY KEY); ALTER TABLE product_tags DROP CONSTRAINT product_tags_tag_id_tags_id_fk; ALTER TABLE product_tags ADD CONSTRAINT product_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES "public.tags"(id)',
      diagnostic: 'product_tags',
    },
    {
      label: 'quoted-dot primary key column',
      change:
        'ALTER TABLE profiles ADD COLUMN "public.id" varchar(26) NOT NULL; ALTER TABLE profiles DROP CONSTRAINT profiles_pkey; ALTER TABLE profiles ADD PRIMARY KEY ("public.id")',
      diagnostic: 'profiles',
    },
    {
      label: 'quoted-dot index column',
      change:
        'ALTER TABLE votes ADD COLUMN "public.count" integer; DROP INDEX votes_count_idx; CREATE INDEX votes_count_idx ON votes ("public.count" DESC)',
      diagnostic: 'votes_count_idx',
    },
    {
      label: 'escaped-quote foreign key target',
      change:
        'CREATE TABLE "ta""gs" (id varchar(26) PRIMARY KEY); ALTER TABLE product_tags DROP CONSTRAINT product_tags_tag_id_tags_id_fk; ALTER TABLE product_tags ADD CONSTRAINT product_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES "ta""gs"(id)',
      diagnostic: 'product_tags',
    },
    {
      label: 'escaped-quote primary key column',
      change:
        'ALTER TABLE profiles ADD COLUMN "i""d" varchar(26) NOT NULL; ALTER TABLE profiles DROP CONSTRAINT profiles_pkey; ALTER TABLE profiles ADD PRIMARY KEY ("i""d")',
      diagnostic: 'profiles',
    },
    {
      label: 'escaped-quote index column',
      change:
        'ALTER TABLE votes ADD COLUMN "co""unt" integer; DROP INDEX votes_count_idx; CREATE INDEX votes_count_idx ON votes ("co""unt" DESC)',
      diagnostic: 'votes_count_idx',
    },
    { label: 'index', change: 'DROP INDEX unique_translation', diagnostic: 'unique_translation' },
    {
      label: 'index shape',
      change: 'DROP INDEX votes_count_idx; CREATE INDEX votes_count_idx ON votes (count ASC)',
      diagnostic: 'votes_count_idx',
    },
  ])('$label 불일치를 진단하고 baseline 이력을 남기지 않는다', async ({ change, diagnostic }) => {
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
