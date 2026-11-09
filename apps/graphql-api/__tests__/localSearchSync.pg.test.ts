import 'reflect-metadata';
import { PostgresqlProductRepository } from '@darun/products-datasource';
import { EditProduct, PublishProduct } from '@darun/products-domain';
import { and, eq } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import mongoose from 'mongoose';
import postgres, { type Sql } from 'postgres';
import { Container } from 'typedi';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { productContentSyncIntents } from '../../../libs/products/datasource/src/entities/ProductContentSyncIntentSchema';
import { products } from '../../../libs/products/datasource/src/entities/ProductSchema';
import { ProductContentSyncRegistrarToken } from '../../../libs/products/datasource/src/repositories/productContentSync';
import { translationJobs } from '../../../libs/translation/datasource/src/entities/TranslationJobSchema';
import { registerProductContentSync } from '../src/adapters/PostgresqlProductContentSync';
import { localSearchOptions } from '../src/local-search-sync';

const databaseUrl = process.env['LOCAL_SEARCH_SYNC_TEST_DATABASE_URL'];
const mongodbUri = process.env['LOCAL_SEARCH_SYNC_TEST_MONGODB_URI'];
const run = promisify(execFile);

(databaseUrl && mongodbUri ? describe : describe.skip)('로컬 검색 명령과 격리 PostgreSQL/Mongo', () => {
  const env = { PATH: process.env['PATH'], INFRA_ENV: 'local', DATABASE_URL: databaseUrl, MONGODB_URI: mongodbUri };
  let connection: Sql;
  let db: PostgresJsDatabase;
  let repository: PostgresqlProductRepository;
  let ownsSchema = false;
  let ownsMongo = false;

  beforeAll(async () => {
    const options = localSearchOptions([], env);
    connection = postgres(options.databaseUrl, { prepare: false, max: 4 });
    db = drizzle(connection);
    repository = new PostgresqlProductRepository(db);
    const tables = await connection`select tablename from pg_tables where schemaname in ('public', 'drizzle')`;
    if (tables.length) throw new Error('새 격리 PostgreSQL darun DB만 사용할 수 있습니다.');
    ownsSchema = true;
    await migrate(db, { migrationsFolder: resolve('scripts/migrations') });
    await mongoose.connect(options.mongodbUri, { directConnection: true });
    if ((await mongoose.connection.db!.listCollections().toArray()).length)
      throw new Error('새 격리 Mongo darun DB만 사용할 수 있습니다.');
    ownsMongo = true;
    Container.set(ProductContentSyncRegistrarToken, { register: registerProductContentSync });
  }, 30_000);

  beforeEach(async () => {
    await db.delete(productContentSyncIntents);
    await db.delete(translationJobs);
    await db.delete(products);
    await mongoose.connection.db!.collection('searchableProducts').deleteMany({});
  });

  afterAll(async () => {
    Container.remove(ProductContentSyncRegistrarToken);
    if (ownsSchema) {
      await connection`drop schema public cascade`;
      await connection`drop schema drizzle cascade`;
      await connection`create schema public`;
    }
    if (ownsMongo && (await mongoose.connection.db!.listCollections({ name: 'searchableProducts' }).toArray()).length)
      await mongoose.connection.db!.collection('searchableProducts').drop();
    await mongoose.disconnect();
    await connection?.end({ timeout: 5 });
  });

  async function command(...args: string[]) {
    return run(process.execPath, ['scripts/local-search-sync.cjs', ...args], { env, timeout: 30_000 });
  }

  async function publish() {
    const [product] = await db
      .insert(products)
      .values({
        name: '로컬 발행',
        slug: `local-search-fixture-${randomUUID()}`,
        summary: '로컬 요약',
        description: '<p>처음 본문</p>',
        logoUrl: 'fixture',
      })
      .returning();
    await new PublishProduct(repository).execute({ id: product!.id });
    return product!;
  }

  const searchIntent = async (productId: string) =>
    await db
      .select()
      .from(productContentSyncIntents)
      .where(and(eq(productContentSyncIntents.productId, productId), eq(productContentSyncIntents.kind, 'search')));

  it('발행 뒤 한 배치만 처리하고 번역 job과 intent를 바꾸지 않는다', async () => {
    const first = await publish();
    await publish();
    const jobsBefore = await db.select().from(translationJobs);
    const translationsBefore = await db
      .select()
      .from(productContentSyncIntents)
      .where(eq(productContentSyncIntents.kind, 'translation'));
    const result = await command('--limit', '1');
    expect(JSON.parse(result.stdout)).toMatchObject({
      processed: 1,
      intents: [{ status: 'completed', attemptCount: 1 }],
    });
    expect((await searchIntent(first.id))[0]).toMatchObject({ status: 'completed', sourceRevision: 1n });
    expect(
      await mongoose.connection.db!.collection('searchableProducts').findOne({ productId: first.id })
    ).toMatchObject({ name: '로컬 발행', summary: '로컬 요약' });
    expect(await db.select().from(translationJobs)).toEqual(jobsBefore);
    expect(
      await db.select().from(productContentSyncIntents).where(eq(productContentSyncIntents.kind, 'translation'))
    ).toEqual(translationsBefore);
  }, 30_000);

  it('수정 전후 intent가 함께 있어도 최신 revision만 반영하고 중복 명령이 예산을 소비하지 않는다', async () => {
    const product = await publish();
    await new EditProduct(repository).execute({ id: product.id, name: '최신 이름', description: '<p>최신 본문</p>' });
    await Promise.all([command(), command()]);
    const intents = await searchIntent(product.id);
    expect(intents.find(intent => intent.sourceRevision === 1n)).toMatchObject({
      status: 'superseded',
      attemptCount: 0,
    });
    expect(intents.find(intent => intent.sourceRevision === 2n)).toMatchObject({
      status: 'completed',
      attemptCount: 1,
    });
    const document = await mongoose.connection
      .db!.collection('searchableProducts')
      .findOne({ productId: product.id }, { promoteLongs: false });
    expect(document).toMatchObject({ name: '최신 이름', description: '<p>최신 본문</p>' });
    expect(document!['sourceRevision'].toString()).toBe('2');
    expect(JSON.parse((await command()).stdout)).toEqual({ processed: 0, intents: [] });
  }, 60_000);

  it('실제 Mongo 쓰기 실패를 저장하고 due time 뒤 같은 intent를 재시도한다', async () => {
    const product = await publish();
    await mongoose.connection.db!.createCollection('searchableProducts').catch(error => {
      if (error.code !== 48) throw error;
    });
    await mongoose.connection.db!.command({
      collMod: 'searchableProducts',
      validator: { name: { $ne: '로컬 발행' } },
      validationLevel: 'strict',
    });
    try {
      await expect(command()).rejects.toMatchObject({ code: 1 });
      const [failed] = await searchIntent(product.id);
      expect(failed).toMatchObject({ status: 'failed', attemptCount: 1 });
      expect(failed!.retryAfter.getTime()).toBeGreaterThan(Date.now());
      expect(JSON.parse((await command()).stdout)).toEqual({ processed: 0, intents: [] });
    } finally {
      await mongoose.connection.db!.command({ collMod: 'searchableProducts', validator: {} });
    }
    await db
      .update(productContentSyncIntents)
      .set({ retryAfter: new Date(0), dispatchAfter: new Date(0) })
      .where(eq(productContentSyncIntents.productId, product.id));
    await command();
    expect((await searchIntent(product.id))[0]).toMatchObject({ status: 'completed', error: null, attemptCount: 2 });
  }, 60_000);

  it('잘못된 Mongo 대상은 PostgreSQL에 연결하기 전에 거절하고 자격 증명을 출력하지 않는다', async () => {
    let connections = 0;
    const server = createServer(socket => {
      connections++;
      socket.destroy();
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Fixture listener failed');
      const result = await run(process.execPath, ['scripts/local-search-sync.cjs'], {
        env: {
          ...env,
          DATABASE_URL: `postgresql://127.0.0.1:${address.port}/darun`,
          MONGODB_URI: 'mongodb://fixture:never-print-this@example.invalid/darun',
        },
        timeout: 30_000,
      }).then(
        () => {
          throw new Error('Invalid target was accepted');
        },
        error => error
      );
      expect(result.code).toBe(1);
      expect(`${result.stdout}${result.stderr}`).not.toContain('never-print-this');
      expect(connections).toBe(0);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }, 30_000);

  it('watch는 명시적으로만 반복하고 SIGTERM 뒤 연결을 닫고 종료한다', async () => {
    await publish();
    await publish();
    const child = spawn(process.execPath, ['scripts/local-search-sync.cjs', '--watch', '--limit', '1'], { env });
    let stdout = '';
    const exit = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
      const deadline = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('watch did not stop'));
      }, 30_000);
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        clearTimeout(deadline);
        resolve({ code, signal });
      });
    });
    child.stdout.on('data', data => {
      stdout += data;
      if (stdout.includes('\n')) child.kill('SIGTERM');
    });
    expect(await exit).toEqual({ code: 0, signal: null });
    expect(JSON.parse(stdout)).toMatchObject({ processed: 1 });
    const rows = await db.select().from(productContentSyncIntents).where(eq(productContentSyncIntents.kind, 'search'));
    expect(rows.map(row => row.status).sort()).toEqual(['completed', 'pending']);
  }, 35_000);
});
