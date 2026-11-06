import 'reflect-metadata';
import { SearchableProduct } from '@darun/search-domain';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import mongoose, { mongo } from 'mongoose';
import postgres from 'postgres';
import { Container } from 'typedi';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { categories } from '../../../libs/products/datasource/src/entities/CategorySchema';
import { productContentSyncIntents } from '../../../libs/products/datasource/src/entities/ProductContentSyncIntentSchema';
import { products } from '../../../libs/products/datasource/src/entities/ProductSchema';
import { PostgresqlCategoryRepository } from '../../../libs/products/datasource/src/repositories/PostgresqlCategoryRepository';
import { ProductContentSyncRegistrarToken } from '../../../libs/products/datasource/src/repositories/productContentSync';
import { ProductContentSyncQueueService } from '../../../libs/products/service/src/ProductContentSyncQueueService';
import { SearchableProductModel } from '../../../libs/search/datasource/src/entities/SearchableProductSchema';
import { MongodbSearchableProductRepository } from '../../../libs/search/datasource/src/repositories/MongodbSearchableProductRepository';
import { PostgresqlProductContentSync, registerProductContentSync } from '../src/adapters/PostgresqlProductContentSync';

const databaseUrl = process.env['CATEGORY_SEARCH_TEST_DATABASE_URL'];
const mongodbUrl = process.env['CATEGORY_SEARCH_TEST_MONGODB_URI'];
describe.skipIf(!databaseUrl || !mongodbUrl)('카테고리 검색의 실제 PostgreSQL → MongoDB Search 계약', () => {
  let connection: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  let search: MongodbSearchableProductRepository;
  let sync: PostgresqlProductContentSync;

  beforeAll(async () => {
    for (const [value, protocol] of [
      [databaseUrl!, 'postgresql:'],
      [mongodbUrl!, 'mongodb:'],
    ]) {
      const url = new URL(value!);
      if (
        url.protocol !== protocol ||
        !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        url.pathname !== '/darun_category_search' ||
        [...url.searchParams.keys()].some(key => key !== 'directConnection')
      )
        throw new Error('Requires dedicated local darun_category_search databases');
    }
    connection = postgres(databaseUrl!, { prepare: false });
    db = drizzle(connection);
    await migrate(db, {
      migrationsFolder: resolve(process.cwd(), 'scripts/migrations'),
    });
    await mongoose.connect(mongodbUrl!);
    await SearchableProductModel.init();
    const indexes = await SearchableProductModel.collection.listSearchIndexes('searchable_products_index').toArray();
    if (!indexes.length)
      await SearchableProductModel.collection.createSearchIndex({
        name: 'searchable_products_index',
        definition: { mappings: { dynamic: true } },
      });
    await vi.waitFor(
      async () => {
        const [index] = await SearchableProductModel.collection
          .listSearchIndexes('searchable_products_index')
          .toArray();
        expect((index as { queryable?: boolean } | undefined)?.queryable).toBe(true);
      },
      { timeout: 120_000 }
    );
    search = new MongodbSearchableProductRepository(async () => {});
    sync = new PostgresqlProductContentSync(db as never, search, new ProductContentSyncQueueService());
    Container.set(ProductContentSyncRegistrarToken, {
      register: registerProductContentSync,
    });
  }, 150_000);

  afterAll(async () => {
    Container.reset();
    await mongoose.disconnect();
    await connection?.end({ timeout: 5 });
  });

  it('두 번째 카테고리의 한영 이름·slug로 검색하고 rename 뒤 새 revision의 이름만 저장한다', async () => {
    const suffix = randomUUID().slice(0, 8);
    const rows = await db
      .insert(categories)
      .values([
        {
          slug: `drawing-${suffix}`,
          labelKo: '일러스트',
          labelEn: 'Illustration',
        },
        {
          slug: `workflow-${suffix}`,
          labelKo: '업무자동화',
          labelEn: 'Orchestration',
        },
      ])
      .returning();
    const [product] = await db
      .insert(products)
      .values({
        slug: `neutral-${suffix}`,
        name: 'Neutral app',
        summary: 'A plain summary',
        description: 'Unrelated body',
        logoUrl: 'fixture',
        publishedAt: new Date(),
        categoryIds: [rows[0]!.id, rows[1]!.id],
      })
      .returning();
    const request = await sync.requestSearch(product!.slug);
    await sync.executeSearch(request.intentId);
    expect(await sync.status(request.intentId)).toMatchObject({
      status: 'completed',
    });
    const stored = await SearchableProductModel.collection.findOne({
      productId: product!.id,
    });
    expect(stored?.categoryText).toEqual(
      expect.arrayContaining(['일러스트', 'Illustration', rows[0]!.slug, '업무자동화', 'Orchestration', rows[1]!.slug])
    );
    for (const query of ['일러스트', 'Illustration', '업무자동화', 'Orchestration', rows[1]!.slug]) {
      await expect
        .poll(async () => (await search.searchProduct(query)).map(row => row.id), {
          timeout: 60_000,
        })
        .toContain(product!.id);
    }
    await new PostgresqlCategoryRepository(db as never).updateById(rows[1]!.id, value => {
      value.update({ labelKo: '협업관리', labelEn: 'Collaboration' });
      return value;
    });
    const [next] = await db
      .select()
      .from(productContentSyncIntents)
      .where(
        and(
          eq(productContentSyncIntents.productId, product!.id),
          eq(productContentSyncIntents.kind, 'search'),
          eq(productContentSyncIntents.sourceRevision, 1n)
        )
      );
    expect(next).toBeDefined();
    await sync.executeSearch(next!.id);
    const renamed = await SearchableProductModel.collection.findOne({
      productId: product!.id,
    });
    expect(renamed?.categoryText).toEqual(expect.arrayContaining(['협업관리', 'Collaboration', rows[1]!.slug]));
    expect(renamed?.categoryText).not.toEqual(expect.arrayContaining(['업무자동화']));
    expect(renamed?.categoryText).not.toEqual(expect.arrayContaining(['Orchestration']));
    expect(renamed?.sourceRevision.toString()).toBe('1');
    await expect
      .poll(async () => (await search.searchProduct('Collaboration')).map(row => row.id), {
        timeout: 60_000,
      })
      .toContain(product!.id);
    await expect
      .poll(async () => (await search.searchProduct('Orchestration')).map(row => row.id), {
        timeout: 60_000,
      })
      .not.toContain(product!.id);
  }, 150_000);

  it('같은 revision의 구형 문서를 명시적으로 재색인하고 중복·오래된 쓰기는 새 텍스트를 덮지 않는다', async () => {
    const id = randomUUID();
    await SearchableProductModel.collection.insertOne({
      productId: id,
      name: 'Legacy',
      votes: 19,
      sourceRevision: mongo.Long.fromString('7'),
      category: 'old-id',
    });
    const payload = (sourceRevision: string, categoryText: string[]) =>
      new SearchableProduct({
        id,
        slug: id,
        name: 'Legacy',
        summary: 'Summary',
        sourceRevision,
        categoryText,
      });
    expect(await search.index(id, payload('7', ['기획', 'Planning']))).toBe(true);
    expect(await SearchableProductModel.collection.findOne({ productId: id })).toMatchObject({
      categoryText: ['기획', 'Planning'],
      votes: 19,
      category: 'old-id',
    });
    await search.index(id, payload('7', ['Duplicate']));
    await search.index(id, payload('6', ['Stale']));
    expect((await SearchableProductModel.collection.findOne({ productId: id }))?.categoryText).toEqual([
      '기획',
      'Planning',
    ]);
    await search.index(id, payload('8', []));
    expect((await SearchableProductModel.collection.findOne({ productId: id }))?.categoryText).toEqual([]);
    // An older deployed writer advances sourceRevision but preserves unknown fields.
    await SearchableProductModel.collection.updateOne(
      { productId: id },
      {
        $set: { sourceRevision: mongo.Long.fromString('9') },
      }
    );
    await search.index(id, payload('9', ['복원', 'Recovery']));
    const restored = await SearchableProductModel.collection.findOne({
      productId: id,
    });
    expect(restored?.categoryText).toEqual(['복원', 'Recovery']);
    expect(restored?.categoryTextRevision.toString()).toBe('9');
  });
});
