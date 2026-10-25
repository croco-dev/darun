import postgres from 'postgres';
import { expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const databaseUrl = process.env['LOCAL_BOOTSTRAP_TEST_DATABASE_URL'];
const appDir = join(__dirname, '..');

async function assertEmptySchemas(sql: postgres.Sql) {
  const existing = await sql`SELECT 1 FROM pg_depend d
    JOIN pg_namespace n ON n.oid = d.refobjid
    WHERE d.refclassid = 'pg_namespace'::regclass AND n.nspname IN ('public', 'drizzle')
    UNION ALL SELECT 1 FROM pg_namespace WHERE nspname = 'drizzle'
    LIMIT 1`;
  if (existing.length) throw new Error('Bootstrap test refuses a nonempty database');
}

it.skipIf(!databaseUrl)(
  '로컬 준비는 데이터와 이력을 보존하고 명시적 reset만 삭제한다',
  { timeout: 120_000 },
  async () => {
    if (!URL.canParse(databaseUrl!)) throw new Error('Invalid bootstrap fixture URL');
    const url = new URL(databaseUrl!);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.pathname !== '/darun' ||
      url.username !== 'bootstrap_fixture' ||
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      url.search ||
      url.hash ||
      databaseUrl!.split('@').length > 2
    ) {
      throw new Error('Use an empty dedicated local PostgreSQL server with bootstrap_fixture user and darun database');
    }
    const sql = postgres(url.toString(), { max: 1 });
    const root = mkdtempSync(join(tmpdir(), 'darun-bootstrap-'));
    let ownsSchema = false;
    try {
      await assertEmptySchemas(sql);
      ownsSchema = true;
      // Objects without table rows are still preexisting work and must prevent ownership.
      for (const [create, lookup, drop] of [
        [
          "CREATE TYPE fixture_existing_enum AS ENUM ('keep')",
          "SELECT to_regtype('public.fixture_existing_enum') AS object",
          'DROP TYPE fixture_existing_enum',
        ],
        [
          'CREATE FUNCTION fixture_existing_function() RETURNS integer LANGUAGE sql AS $$ SELECT 73 $$',
          "SELECT to_regprocedure('public.fixture_existing_function()') AS object",
          'DROP FUNCTION fixture_existing_function()',
        ],
        [
          'CREATE SEQUENCE fixture_existing_sequence',
          "SELECT to_regclass('public.fixture_existing_sequence') AS object",
          'DROP SEQUENCE fixture_existing_sequence',
        ],
        ['CREATE SCHEMA drizzle', "SELECT to_regnamespace('drizzle') AS object", 'DROP SCHEMA drizzle'],
      ]) {
        await sql.unsafe(create!);
        await expect(assertEmptySchemas(sql)).rejects.toThrow('nonempty database');
        expect((await sql.unsafe(lookup!))[0]?.['object']).not.toBeNull();
        await sql.unsafe(drop!);
      }
      await assertEmptySchemas(sql);
      symlinkSync(join(appDir, 'node_modules'), join(root, 'node_modules'), 'dir');
      cpSync(join(appDir, 'scripts'), join(root, 'scripts'), {
        recursive: true,
      });
      const script = join(root, 'scripts', 'bootstrap-local.ts');
      const run = (...args: string[]) => {
        const result = spawnSync(process.execPath, [require.resolve('tsx/cli'), script, ...args], {
          cwd: appDir,
          env: {
            ...process.env,
            NODE_ENV: 'development',
            DATABASE_URL: url.toString(),
          },
          encoding: 'utf8',
          timeout: 30_000,
        });
        if (result.error) throw result.error;
        return { status: result.status, output: result.stdout + result.stderr };
      };
      const history = () => sql`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id`;
      const fixture = () => sql`SELECT id, slug, name FROM products WHERE id = 'bootstrap_product'`;

      let result = run();
      expect(result.status, result.output).toBe(0);
      await sql`INSERT INTO products (id, slug, name, summary, logo_url) VALUES ('bootstrap_product', 'preserved-product', 'Keep this product', 'Fixture summary', 'https://example.invalid/logo.png')`;
      const before = await history();
      expect(before.length).toBeGreaterThan(0);
      const product = [
        {
          id: 'bootstrap_product',
          slug: 'preserved-product',
          name: 'Keep this product',
        },
      ];
      // Any DROP, even followed by reconstruction, is forbidden on ordinary bootstrap.
      await sql.unsafe(`CREATE FUNCTION public.reject_bootstrap_drop() RETURNS event_trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'ordinary bootstrap attempted DROP'; END $$;
      CREATE EVENT TRIGGER reject_bootstrap_drop ON sql_drop EXECUTE FUNCTION public.reject_bootstrap_drop()`);
      for (let i = 0; i < 2; i++) {
        result = run();
        expect(result.status, result.output).toBe(0);
        expect(await fixture()).toEqual(product);
        expect(await history()).toEqual(before);
      }
      // Append genuinely failing pending SQL only in this run's temporary copy.
      const folder = join(root, 'scripts', 'migrations');
      const journalPath = join(folder, 'meta', '_journal.json');
      const original = readFileSync(journalPath, 'utf8');
      const journal = JSON.parse(original);
      const previous = journal.entries.at(-1);
      journal.entries.push({
        ...previous,
        idx: previous.idx + 1,
        when: previous.when + 1,
        tag: '9999_bootstrap_failure',
      });
      writeFileSync(journalPath, JSON.stringify(journal));
      writeFileSync(join(folder, '9999_bootstrap_failure.sql'), 'SELECT * FROM nonexistent_bootstrap_failure;');
      result = run();
      expect(result.status, result.output).not.toBe(0);
      expect(await fixture()).toEqual(product);
      expect(await history()).toEqual(before);
      writeFileSync(journalPath, original);

      for (const args of [['--reset'], ['--confirm-delete-local-data'], ['--typo']]) {
        result = run(...args);
        expect(result.status, result.output).not.toBe(0);
        expect(await fixture()).toEqual(product);
        expect(await history()).toEqual(before);
      }
      await sql.unsafe('DROP EVENT TRIGGER reject_bootstrap_drop');
      result = run('--reset', '--confirm-delete-local-data');
      expect(result.status, result.output).toBe(0);
      expect(result.output).toContain('public');
      expect(result.output).toContain('drizzle');
      expect(await fixture()).toEqual([]);
      expect((await history()).map(row => row['hash'])).toEqual(before.map(row => row['hash']));

      await sql.unsafe('DROP SCHEMA public CASCADE; DROP SCHEMA drizzle CASCADE; CREATE SCHEMA public');
      await sql`CREATE TABLE incompatible_fixture (id text PRIMARY KEY)`;
      await sql`INSERT INTO incompatible_fixture VALUES ('preserve-on-error')`;
      result = run();
      expect(result.status, result.output).not.toBe(0);
      expect(result.output).toContain('Unrecorded existing schema');
      expect(await sql`SELECT id FROM incompatible_fixture`).toEqual([{ id: 'preserve-on-error' }]);
    } finally {
      if (ownsSchema) {
        await sql.unsafe('DROP EVENT TRIGGER IF EXISTS reject_bootstrap_drop');
        await sql.unsafe('DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public');
      }
      await sql.end();
      rmSync(root, { recursive: true, force: true });
    }
  }
);
