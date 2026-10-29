import 'reflect-metadata';
import { AddProductScreenshot } from '@darun/products-domain';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { products } from '../entities/ProductSchema';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';
import { PostgresqlProductScreenshotRepository } from '../repositories/PostgresqlProductScreenshotRepository';

const url = process.env.SCREENSHOT_URL_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const productId = 'screenshot-url-product';
const legacyId = 'screenshot-url-legacy';
const slug = 'p'.repeat(100);
const publicId = `${'f'.repeat(64)}-0123456789ab`;
const imageUrl = (cloud: string) =>
  `https://res.cloudinary.com/${cloud}/image/upload/v1700000000/images/screenshots/${slug}/${publicId}.png`;
const legacyUrl = imageUrl('c');

suite('스크린샷 URL 저장 (격리 PostgreSQL 필요)', () => {
  let sql: postgres.Sql;
  let repo: PostgresqlProductScreenshotRepository;
  let add: AddProductScreenshot;
  let fixturesInserted = false;
  const screenshotIds = [legacyId];

  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/darun_screenshot_urls' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      target.search ||
      target.hash
    ) {
      throw new Error('Requires isolated local darun_screenshot_urls database');
    }
    sql = postgres(url!, { max: 1, connect_timeout: 5 });
    const db = drizzle(sql);
    const migrationsFolder = resolve(__dirname, '../../../../../apps/graphql-api/scripts/migrations');
    const previousMigrations = await mkdtemp(join(tmpdir(), 'darun-screenshot-url-'));
    try {
      // Upgrade a populated database from the last migration before the URL expansion.
      const journal = JSON.parse(await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'));
      journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= 19);
      await mkdir(join(previousMigrations, 'meta'));
      await writeFile(join(previousMigrations, 'meta/_journal.json'), JSON.stringify(journal));
      for (const entry of journal.entries) {
        await copyFile(join(migrationsFolder, `${entry.tag}.sql`), join(previousMigrations, `${entry.tag}.sql`));
      }
      await migrate(db, { migrationsFolder: previousMigrations });
      await db.insert(products).values({
        id: productId,
        slug,
        name: 'Long URL',
        summary: 'Fixture',
        logoUrl: '',
      });
      fixturesInserted = true;
      await db.insert(productScreenshots).values({
        id: legacyId,
        productId,
        imageUrl: legacyUrl,
        imageAlt: '기존 화면',
      });
    } finally {
      await rm(previousMigrations, { recursive: true, force: true });
    }
    await migrate(db, { migrationsFolder });
    // Reapplying the journal must leave both the existing row and expanded column intact.
    await migrate(db, { migrationsFolder });
    repo = new PostgresqlProductScreenshotRepository(db);
    add = new AddProductScreenshot(repo);
  }, 30_000);

  afterAll(async () => {
    if (!sql) return;
    try {
      if (fixturesInserted) {
        await sql`DELETE FROM screenshot_cleanup_intents WHERE screenshot_id IN ${sql(screenshotIds)}`;
        await sql`DELETE FROM product_screenshots WHERE product_id = ${productId}`;
        await sql`DELETE FROM products WHERE id = ${productId}`;
      }
    } finally {
      await sql.end({ timeout: 5 });
    }
  });

  it('migration과 재실행 후에도 기존 255자 URL과 대체 텍스트를 보존한다', async () => {
    expect(legacyUrl).toHaveLength(255);
    expect(await repo.findById(legacyId)).toMatchObject({
      imageUrl: legacyUrl,
      imageAlt: '기존 화면',
    });
  });

  it.each([
    ['cloudx', 260],
    ['cloudinary-fixture', 272],
  ] as const)('%s의 %i자 URL을 등록하고 공개 조회와 삭제 정리까지 온전히 전달한다', async (cloud, length) => {
    const expectedUrl = imageUrl(cloud);
    expect(expectedUrl).toHaveLength(length);
    await add.execute({
      productId,
      imageUrl: expectedUrl,
      imageAlt: '긴 경로 화면',
      platform: 'WEB',
    });
    const saved = (await repo.findManyByProductIdSortByPriorityDesc(productId)).find(
      screenshot => screenshot.imageUrl === expectedUrl
    );
    expect(saved).toBeDefined();
    screenshotIds.push(saved!.id);
    expect(await repo.findById(saved!.id)).toMatchObject({
      imageUrl: expectedUrl,
      imageAlt: '긴 경로 화면',
    });
    const [stored] = await sql`SELECT image_url FROM product_screenshots WHERE id = ${saved!.id}`;
    expect(stored.image_url).toBe(expectedUrl);

    await sql`UPDATE products SET published_at = NOW() WHERE id = ${productId}`;
    try {
      expect(await repo.findVisualPublishedById(saved!.id)).toMatchObject({
        imageUrl: expectedUrl,
        productSlug: slug,
      });
    } finally {
      await sql`UPDATE products SET published_at = NULL WHERE id = ${productId}`;
    }
    await repo.deleteWithLock(saved!.id, async () => {});
    expect(await repo.findById(saved!.id)).toBeNull();
    const [cleanup] = await sql`SELECT image_url FROM screenshot_cleanup_intents WHERE screenshot_id = ${saved!.id}`;
    expect(cleanup.image_url).toBe(expectedUrl);
    const [product] = await sql`SELECT content_revision FROM products WHERE id = ${productId}`;
    expect(Number(product.content_revision)).toBeGreaterThan(0);
  });
});
