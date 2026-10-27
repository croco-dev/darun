import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const databaseUrl = process.env.CATEGORY_BACKFILL_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const appDir = resolve(__dirname, '..');

suite('카테고리 역채우기 (격리 PostgreSQL 필요)', () => {
  let sql: postgres.Sql;

  const runSeed = () =>
    spawnSync('pnpm', ['seed:categories'], {
      cwd: appDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: 'utf8',
      timeout: 30_000,
    });
  const snapshot = async () => ({
    products: await sql`SELECT id, category_ids, content_revision FROM products ORDER BY id`,
    intents: await sql`SELECT * FROM product_content_sync_intents ORDER BY id`,
    jobs: await sql`SELECT * FROM translation_jobs ORDER BY id`,
  });

  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/darun_category_backfill' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      target.search ||
      target.hash
    ) {
      throw new Error('Requires isolated local darun_category_backfill database');
    }
    sql = postgres(databaseUrl!, { max: 1, connect_timeout: 5 });
    await migrate(drizzle(sql), { migrationsFolder: resolve(appDir, 'scripts/migrations') });
  }, 30_000);

  beforeEach(async () => {
    await sql`DELETE FROM product_content_sync_intents`;
    await sql`DELETE FROM translation_jobs`;
    await sql`DELETE FROM product_tags`;
    await sql`DELETE FROM products`;
    await sql`DELETE FROM tags`;
    await sql`DELETE FROM categories`;
    await sql`INSERT INTO categories (id, slug, label_ko, label_en) VALUES
      ('cat-manual', 'manual', '수동', 'Manual'),
      ('cat-productivity', 'productivity', '생산성', 'Productivity')`;
    await sql`INSERT INTO tags (id, name, type) VALUES ('tag-mapped', '생산성', 'category'), ('tag-unmapped', '매핑 없음', 'category')`;
  });

  afterAll(async () => {
    if (sql) await sql.end({ timeout: 5 });
  });

  it('수동 분류를 보존하며 누락된 분류만 추가하고 재실행은 revision과 intent를 늘리지 않는다', async () => {
    await sql`INSERT INTO products (id, slug, name, summary, logo_url, category_ids, published_at) VALUES
        ('manual', 'manual', 'Manual product', 'summary', '', '["cat-manual"]', NOW()),
        ('empty', 'empty', 'Empty product', 'summary', '', '[]', NOW()),
        ('unmapped', 'unmapped', 'Unmapped product', 'summary', '', '["cat-manual"]', NOW()),
        ('already', 'already', 'Already mapped', 'summary', '', '["cat-productivity","cat-manual"]', NOW()),
        ('draft', 'draft', 'Unpublished', 'summary', '', '["cat-manual"]', NULL)`;
    await sql`INSERT INTO product_tags (id, product_id, tag_id) VALUES
        ('pt-manual', 'manual', 'tag-mapped'), ('pt-empty', 'empty', 'tag-mapped'),
        ('pt-unmapped', 'unmapped', 'tag-unmapped'), ('pt-already', 'already', 'tag-mapped'),
        ('pt-draft', 'draft', 'tag-mapped')`;

    const first = runSeed();
    expect(first.error).toBeUndefined();
    expect(first.status, first.stdout + first.stderr).toBe(0);
    const after = await snapshot();
    expect(after.products).toEqual([
      { id: 'already', category_ids: ['cat-productivity', 'cat-manual'], content_revision: '0' },
      { id: 'draft', category_ids: ['cat-manual'], content_revision: '0' },
      { id: 'empty', category_ids: ['cat-productivity'], content_revision: '1' },
      { id: 'manual', category_ids: ['cat-manual', 'cat-productivity'], content_revision: '1' },
      { id: 'unmapped', category_ids: ['cat-manual'], content_revision: '0' },
    ]);
    expect(after.intents.map(row => [row['product_id'], row['source_revision'], row['kind']]).sort()).toEqual([
      ['empty', '1', 'search'],
      ['manual', '1', 'search'],
    ]);
    expect(after.jobs).toEqual([]);
    expect(first.stdout).toContain('2개 product');
    const second = runSeed();
    expect(second.error).toBeUndefined();
    expect(second.status, second.stdout + second.stderr).toBe(0);
    expect(second.stdout).toContain('0개 product');
    expect(await snapshot()).toEqual(after);
  }, 70_000);

  it('intent 저장 실패 시 해당 상품의 분류와 revision도 함께 rollback한다', async () => {
    await sql`INSERT INTO products (id, slug, name, summary, logo_url, category_ids, published_at)
      VALUES ('rollback', 'rollback', 'Rollback product', 'summary', '', '["cat-manual"]', NOW())`;
    await sql`INSERT INTO product_tags (id, product_id, tag_id) VALUES ('pt-rollback', 'rollback', 'tag-mapped')`;
    const before = await snapshot();
    await sql.unsafe(`CREATE FUNCTION reject_category_intent() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'synthetic category intent failure'; END $$;
      CREATE TRIGGER reject_category_intent BEFORE INSERT ON product_content_sync_intents
      FOR EACH ROW EXECUTE FUNCTION reject_category_intent()`);
    try {
      const failed = runSeed();
      expect(failed.error).toBeUndefined();
      expect(failed.status).toBe(1);
      expect(failed.stdout + failed.stderr).toContain('synthetic category intent failure');
      expect(await snapshot()).toEqual(before);
    } finally {
      await sql`DROP TRIGGER reject_category_intent ON product_content_sync_intents`;
      await sql`DROP FUNCTION reject_category_intent()`;
    }
    const retried = runSeed();
    expect(retried.status, retried.stdout + retried.stderr).toBe(0);
    expect((await snapshot()).products).toEqual([
      { id: 'rollback', category_ids: ['cat-manual', 'cat-productivity'], content_revision: '1' },
    ]);
  }, 70_000);
});
