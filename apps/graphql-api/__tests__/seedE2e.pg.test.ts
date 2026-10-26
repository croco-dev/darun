import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { mongo } from 'mongoose';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const databaseUrl = process.env['E2E_SEED_TEST_DATABASE_URL'];
const mongodbUrl = process.env['E2E_SEED_TEST_MONGODB_URI'];
const suite = databaseUrl && mongodbUrl ? describe : describe.skip;

suite('전용 PostgreSQL/MongoDB의 E2E seed CLI', () => {
  let sql: ReturnType<typeof postgres>;
  let search: mongo.MongoClient;
  const seed = () =>
    run('pnpm', ['--filter', 'graphql-api', 'seed:e2e'], {
      cwd: resolve(__dirname, '../../..'),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        MONGODB_URI: mongodbUrl,
      },
      timeout: 30000,
    });

  beforeAll(async () => {
    if (new URL(databaseUrl!).pathname !== '/darun_e2e') throw new Error('전용 빈 darun_e2e DB가 필요합니다');
    sql = postgres(databaseUrl!, { max: 1 });
    const [existing] = await sql`SELECT to_regclass('public.products') AS name`;
    if (existing?.['name']) throw new Error('빈 전용 DB에서만 실행합니다');
    search = new mongo.MongoClient(mongodbUrl!);
    await search.connect();
    if (await search.db('darun').collection('searchableProducts').countDocuments()) {
      throw new Error('빈 전용 MongoDB에서만 실행합니다');
    }
    await migrate(drizzle(sql), {
      migrationsFolder: resolve(__dirname, '../scripts/migrations'),
    });
  });
  afterAll(async () => {
    await Promise.all([sql?.end(), search?.close()]);
  });

  it('빈 DB와 관계없는 상품 40개가 있는 DB에서 같은 fixture를 복원하고 반복 실행해도 ID와 다른 데이터를 보존한다', async () => {
    await seed();
    const original = await sql`SELECT id, slug FROM products ORDER BY slug`;
    expect(original).toHaveLength(37);
    expect(original.map(row => row['slug'])).toEqual(
      expect.arrayContaining([
        'darun-product',
        'figma-e2e',
        'sketch-e2e',
        'adobe-xd-e2e',
        'invision-e2e',
        ...Array.from({ length: 32 }, (_, i) => `notion-e2e-${String(i + 1).padStart(2, '0')}`),
      ])
    );
    const [figma] = await sql`SELECT id FROM products WHERE slug = 'figma-e2e'`;
    const [sketch] = await sql`SELECT id FROM products WHERE slug = 'sketch-e2e'`;
    const initialEdges = await sql`SELECT * FROM alternative_products ORDER BY id`;
    expect(initialEdges).toHaveLength(3);
    const [magazine] = await sql`SELECT id, published_at FROM magazines WHERE slug = 'intro-e2e'`;
    expect(magazine?.['published_at']).toBe('2025-01-01 00:00:00');

    // Force the bug's precondition: unrelated published rows already exceed 32,
    // while one required slug is missing and other fixture values have drifted.
    await sql`INSERT INTO products (id, slug, name, summary, logo_url, published_at)
      SELECT lpad(n::text, 26, '0'), 'unrelated-' || n, 'Keep ' || n, 'keep', 'https://example.test/logo', now()
      FROM generate_series(1, 40) n`;
    await sql`INSERT INTO votes (id, target_id, count) VALUES ('unrelated-vote', ${String(1).padStart(26, '0')}, 987)`;
    await sql`INSERT INTO alternative_products (id, product_id, alternative_product_id)
      VALUES ('unrelated-edge', ${String(1).padStart(26, '0')}, ${sketch!['id']})`;
    await search
      .db('darun')
      .collection('searchableProducts')
      .insertOne({ productId: 'unrelated', name: 'Keep search' });
    const unrelated = await sql`SELECT * FROM products WHERE slug LIKE 'unrelated-%' ORDER BY id`;
    const unrelatedVotes = await sql`SELECT * FROM votes WHERE target_id = ${String(1).padStart(26, '0')}`;
    const unrelatedEdges =
      await sql`SELECT * FROM alternative_products WHERE product_id = ${String(1).padStart(26, '0')}`;
    const [missing] = await sql`DELETE FROM products WHERE slug = 'notion-e2e-07' RETURNING id`;
    await sql`DELETE FROM votes WHERE target_id = ${missing!['id']}`;
    await search.db('darun').collection('searchableProducts').deleteOne({ productId: missing!['id'] });
    await sql`UPDATE products SET published_at = NULL, name = 'stale' WHERE slug = 'figma-e2e'`;
    await sql`UPDATE votes SET count = 999 WHERE target_id IN (SELECT id FROM products WHERE slug = 'notion-e2e-19')`;
    await sql`INSERT INTO alternative_products (id, product_id, alternative_product_id)
      VALUES ('stale-fixture-edge', ${figma!['id']}, ${String(2).padStart(26, '0')})`;
    await sql`UPDATE magazines SET content = 'stale', published_at = NULL WHERE slug = 'intro-e2e'`;
    await seed();
    const stable = await sql`SELECT id, slug FROM products ORDER BY slug`;
    await seed();
    expect(await sql`SELECT id, slug FROM products ORDER BY slug`).toEqual(stable);
    expect(stable).toHaveLength(77);
    for (const row of original.filter(row => row['slug'] !== 'notion-e2e-07')) {
      expect(stable).toContainEqual(row);
    }
    const ranked = await sql`SELECT p.slug, v.count, p.published_at FROM products p JOIN votes v ON v.target_id=p.id
      WHERE p.slug LIKE 'notion-e2e-%' ORDER BY p.slug`;
    expect(ranked.map(row => [row['slug'], Number(row['count'])])).toEqual(
      Array.from({ length: 32 }, (_, i) => [`notion-e2e-${String(i + 1).padStart(2, '0')}`, i + 1])
    );
    expect(ranked.every(row => row['published_at'] === '2025-01-01 00:00:00')).toBe(true);
    expect(await sql`SELECT * FROM products WHERE slug LIKE 'unrelated-%' ORDER BY id`).toEqual(unrelated);
    expect(await sql`SELECT * FROM votes WHERE target_id = ${String(1).padStart(26, '0')}`).toEqual(unrelatedVotes);
    expect(await sql`SELECT * FROM alternative_products WHERE product_id = ${String(1).padStart(26, '0')}`).toEqual(
      unrelatedEdges
    );
    expect(await sql`SELECT * FROM alternative_products WHERE product_id = ${figma!['id']} ORDER BY id`).toEqual(
      initialEdges
    );
    const [restoredMagazine] = await sql`SELECT id, content, published_at FROM magazines WHERE slug = 'intro-e2e'`;
    expect(restoredMagazine?.['id']).toBe(magazine?.['id']);
    expect(restoredMagazine?.['content']).toContain('E2E');
    expect(restoredMagazine?.['published_at']).toBe('2025-01-01 00:00:00');
    const documents = await search
      .db('darun')
      .collection('searchableProducts')
      .find({ productId: { $ne: 'unrelated' } })
      .toArray();
    expect(documents).toHaveLength(37);
    const rows =
      await sql`SELECT p.*, v.count FROM products p JOIN votes v ON v.target_id=p.id WHERE p.slug NOT LIKE 'unrelated-%'`;
    for (const row of rows) {
      expect(documents.find(doc => doc['productId'] === row['id'])).toMatchObject({
        slug: row['slug'],
        name: row['name'],
        description: row['description'],
        votes: Number(row['count']),
      });
    }
    expect(await search.db('darun').collection('searchableProducts').findOne({ productId: 'unrelated' })).toMatchObject(
      { name: 'Keep search' }
    );
  }, 30000);
});

// Invalid destinations must be rejected before loading the database dependency graph.
const rejectDatabaseImports = `data:text/javascript,${encodeURIComponent(`
  import { registerHooks } from 'node:module';
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (['drizzle-orm', 'mongoose', 'postgres'].some(name => specifier === name || specifier.startsWith(name + '/'))) {
        process.exit(86);
      }
      return nextResolve(specifier, context);
    }
  });
`)}`;

it.each([
  [undefined, undefined],
  ['postgres://u:p@remote.example/darun_e2e', 'mongodb://localhost/darun'],
  ['postgres://u:p@localhost/darun', 'mongodb://localhost/darun'],
  ['postgres://u:p@localhost/darun_e2e', 'mongodb://remote.example/darun'],
  ['postgres://u:p@localhost/darun_e2e', 'mongodb://localhost/darun?proxyHost=remote.example'],
])('로컬 전용 DB 외의 URL을 연결 전에 거절한다 (%s)', async (pg, mongoUrl) => {
  await expect(
    // Exercise the CLI guard without starting a package manager for each rejected URL.
    run(process.execPath, ['--import', 'tsx', 'scripts/seed-e2e.ts'], {
      cwd: resolve(__dirname, '..'),
      env: {
        ...process.env,
        DATABASE_URL: pg ?? '',
        MONGODB_URI: mongoUrl ?? '',
        NODE_OPTIONS: `${process.env['NODE_OPTIONS'] ?? ''} --import=${rejectDatabaseImports}`,
      },
      timeout: 10000,
    })
  ).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('E2E seed 실패:') });
});
