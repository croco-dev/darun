/// <reference lib="es2024.promise" />
import 'reflect-metadata';
import type { GetProduct } from '@darun/products-domain';
import { DrizzleToken } from '@darun/provider-database';
import {
  PostgresqlTranslationJobRepository,
  PostgresqlTranslationRepository,
  LlmTranslationProvider,
} from '@darun/translation-datasource';
import {
  computeSourceHash,
  TranslationService,
  TranslationProviderToken,
  TranslationJobRepositoryToken,
  TranslationSourceStoreToken,
  type UpsertTranslationParams,
  type TranslationSourceStore,
} from '@darun/translation-domain';
import { TranslationJobService } from '@darun/translation-service';
import type { LlmClient } from '@darun/utils-llm';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { Container } from 'typedi';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { setImmediate as yieldImmediate } from 'node:timers/promises';
import { magazines } from '../../../libs/magazines/datasource/src/entities/MagazineSchema';
import { productContentSyncIntents } from '../../../libs/products/datasource/src/entities/ProductContentSyncIntentSchema';
import { productFeatures } from '../../../libs/products/datasource/src/entities/ProductFeaturesSchema';
import { products } from '../../../libs/products/datasource/src/entities/ProductSchema';
import {
  beginProductContentWrite,
  ProductContentSyncRegistrarToken,
} from '../../../libs/products/datasource/src/repositories/productContentSync';
import { lockProductSource } from '../../../libs/products/datasource/src/repositories/productSourceMutex';
import { assertDocumentStructure } from '../../../libs/translation/datasource/src/codecs/htmlPlaceholderCodec';
import { translationJobs } from '../../../libs/translation/datasource/src/entities/TranslationJobSchema';
import { translations } from '../../../libs/translation/datasource/src/entities/TranslationSchema';
import { TranslationQueryResolver } from '../../../libs/translation/feature/src/Translation.query.resolver';
import { TranslationQueueService } from '../../../libs/translation/service/src/TranslationQueueService';
import { registerProductContentSync } from '../src/adapters/PostgresqlProductContentSync';
import { PostgresqlTranslationSourceStore } from '../src/adapters/PostgresqlTranslationSourceStore';

const databaseUrl = process.env['TRANSLATION_TEST_DATABASE_URL'];
const suite = databaseUrl ? describe : describe.skip;
suite('Translation integrity in isolated PostgreSQL', () => {
  let connection: Sql;
  let writer: Sql;
  let db: PostgresJsDatabase;
  let writerDb: PostgresJsDatabase;
  let store: PostgresqlTranslationSourceStore;
  let jobs: PostgresqlTranslationJobRepository;
  let repository: PostgresqlTranslationRepository;
  const applicationName = `translation-${randomUUID()}`;
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (url.hostname !== '127.0.0.1' || url.pathname !== '/darun_translation_integrity')
      throw new Error('Only isolated local translation database is allowed');
    connection = postgres(databaseUrl!, {
      max: 6,
      prepare: false,
      connection: { application_name: `${applicationName}-reader` },
    });
    writer = postgres(databaseUrl!, { max: 1, prepare: false, connection: { application_name: applicationName } });
    db = drizzle(connection);
    writerDb = drizzle(writer);
    await migrate(db, {
      migrationsFolder: resolve(process.cwd(), 'scripts/migrations'),
    });
    store = new PostgresqlTranslationSourceStore(db as never);
    jobs = new PostgresqlTranslationJobRepository(db as never);
    repository = new PostgresqlTranslationRepository(db as never);
    Container.set(DrizzleToken, db);
    Container.set(TranslationSourceStoreToken, store);
    Container.set(TranslationJobRepositoryToken, jobs);
    Container.set(ProductContentSyncRegistrarToken, { register: registerProductContentSync });
  }, 20_000);
  afterAll(async () => {
    Container.reset();
    await writer?.end({ timeout: 5 });
    await connection?.end({ timeout: 5 });
  });

  it('같은 생성 시각의 번역 작업도 100건 페이지 경계에서 빠짐없이 같은 순서로 조회한다', async () => {
    const prefix = `list-bounds-${randomUUID()}`;
    const ids = Array.from({ length: 105 }, (_, i) => `${prefix}-${String(i).padStart(3, '0')}`);
    try {
      await db.insert(translationJobs).values(
        ids.map(id => ({
          id,
          entityType: 'Product',
          entityId: 'list-fixture',
          fields: ['summary'],
          status: 'superseded',
          createdAt: new Date('2099-01-01T00:00:00Z'),
        }))
      );
      const first = await jobs.findJobs({ status: 'superseded', limit: 100, offset: 0 });
      const next = await jobs.findJobs({ status: 'superseded', limit: 5, offset: 100 });
      const expected = [...ids].reverse();
      expect(first.map(job => job.id)).toEqual(expected.slice(0, 100));
      expect(next.map(job => job.id)).toEqual(expected.slice(100));
      expect((await jobs.findJobs({ status: 'superseded', limit: 100 })).map(job => job.id)).toEqual(
        expected.slice(0, 100)
      );
      expect(new Set([...first, ...next].map(job => job.id)).size).toBe(105);
    } finally {
      await db.delete(translationJobs).where(inArray(translationJobs.id, ids));
    }
  });

  it('0014 fields 이관은 legacy status/hash/provenance와 기존 영어를 보존한다', async () => {
    const name = `translation_upgrade_${randomUUID().replaceAll('-', '')}`;
    const directory = await mkdtemp(resolve(tmpdir(), 'opencode-translation-migration-'));
    const url = new URL(databaseUrl!);
    url.pathname = `/${name}`;
    let upgrade: Sql | undefined;
    await connection.unsafe(`CREATE DATABASE ${name}`);
    try {
      const folder = resolve(process.cwd(), 'scripts/migrations');
      await cp(folder, directory, { recursive: true });
      const journalPath = resolve(directory, 'meta/_journal.json');
      const journal = JSON.parse(await readFile(journalPath, 'utf8'));
      journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx < 14);
      await writeFile(journalPath, JSON.stringify(journal));
      upgrade = postgres(url.toString(), { max: 1, prepare: false });
      const upgradeDb = drizzle(upgrade);
      await migrate(upgradeDb, { migrationsFolder: directory });
      await upgrade`INSERT INTO translation_jobs (id,entity_type,entity_id,status,source_hash,model,prompt_version) VALUES ('legacy-job','Product','legacy-product','failed','old-snapshot','old-model','old-version')`;
      await upgrade`INSERT INTO translations (id,entity_type,entity_id,locale,field,value,source_hash,model,prompt_version) VALUES ('legacy-translation','Product','legacy-product','en','name','Human English','old-hash','old-model','old-version')`;
      await migrate(upgradeDb, { migrationsFolder: folder });
      const [job] = await upgradeDb.select().from(translationJobs);
      const [translation] = await upgradeDb.select().from(translations);
      expect(job).toMatchObject({
        fields: null,
        status: 'failed',
        sourceHash: 'old-snapshot',
        model: 'old-model',
        promptVersion: 'old-version',
      });
      expect(translation).toMatchObject({
        value: 'Human English',
        sourceHash: 'old-hash',
        model: 'old-model',
        promptVersion: 'old-version',
      });
    } finally {
      await upgrade?.end({ timeout: 5 });
      await connection.unsafe(`DROP DATABASE ${name}`);
      await rm(directory, { recursive: true, force: true });
    }
  }, 20_000);

  async function seedProduct() {
    const [product] = await db
      .insert(products)
      .values({
        name: '이름',
        summary: '요약',
        description: '<p>설명</p>',
        logoUrl: 'https://example.com/logo.png',
        slug: randomUUID(),
        categoryIds: [],
      })
      .returning();
    const [feature] = await db
      .insert(productFeatures)
      .values({ productId: product!.id, name: '기능', summary: '조건', emoji: '🔎' })
      .returning();
    return { product: product!, feature: feature! };
  }
  async function attempt(entityType: 'Product' | 'Magazine' | 'ProductFeature', entityId: string, fields: string[]) {
    const job = await jobs.createJob({ entityType, entityId, fields });
    await jobs.claimJobLease({ jobId: job.id, leaseToken: 'current', leaseUntil: new Date(Date.now() + 60_000) });
    const snapshot = await store.read({ entityType, entityId, fields });
    const rows = snapshot.values.map(source => ({
      ...source,
      locale: 'en',
      value: source.value ? `English ${source.field}` : '',
      sourceHash: 'provider-must-not-own-hash',
      model: 'provider',
      promptVersion: 'provider-version',
    }));
    return {
      job,
      snapshot,
      rows,
      model: 'verified-model',
      promptVersion: 'verified-version',
      jobId: job.id,
      leaseToken: 'current',
    };
  }

  it.each(['product', 'generic', 'mixed'] as const)(
    '%s 동시 수동 요청은 두 연결에서 같은 활성 번역 작업을 반환한다',
    async entry => {
      const { product } = await seedProduct();
      const bothRead = Promise.withResolvers<void>();
      let reads = 0;
      const queue = { sendJob: vi.fn().mockResolvedValue(true) };
      const services = [db, writerDb].map(database => {
        const source = new PostgresqlTranslationSourceStore(database as never);
        const fencedSource: TranslationSourceStore = {
          read: async request => {
            const snapshot = await source.read(request);
            if (++reads === 2) bothRead.resolve();
            await bothRead.promise;
            return snapshot;
          },
          commit: input => source.commit(input),
          createRetryJob: id => source.createRetryJob(id),
        };
        return new TranslationJobService(
          { execute: async () => product } as unknown as GetProduct,
          {} as never,
          new PostgresqlTranslationJobRepository(database as never),
          fencedSource,
          queue as unknown as TranslationQueueService
        );
      });
      const results = await Promise.all(
        services.map((service, index) =>
          entry === 'product' || (entry === 'mixed' && index === 0)
            ? service.requestProductTranslationJob(product.id)
            : service.requestTranslationJob('Product', product.id, [
                'features',
                'description',
                'summary',
                'name',
                'name',
              ])
        )
      );
      expect(results[0]!.id).toBe(results[1]!.id);
      expect(results.map(job => job.status)).toEqual(['pending', 'pending']);
      expect(await db.select().from(translationJobs).where(eq(translationJobs.entityId, product.id))).toHaveLength(1);
      expect(queue.sendJob.mock.calls.map(([payload]) => payload.jobId)).toEqual([results[0]!.id, results[0]!.id]);
    }
  );

  it('필드 순서·중복은 같은 범위이고 대상·언어·필드 집합이 다르면 별도 작업이다', async () => {
    const request = {
      entityType: 'ProductFeature' as const,
      entityId: randomUUID(),
      fields: ['summary', 'name'],
    };
    const first = await jobs.findOrCreateActiveJob(request);
    const second = await new PostgresqlTranslationJobRepository(writerDb as never).findOrCreateActiveJob({
      ...request,
      fields: ['name', 'summary', 'name'],
    });
    expect(second.id).toBe(first.id);
    const differentScopes = await Promise.all([
      jobs.findOrCreateActiveJob({ ...request, fields: ['summary'] }),
      jobs.findOrCreateActiveJob({ ...request, locale: 'fr' }),
      jobs.findOrCreateActiveJob({ ...request, entityType: 'Product' }),
      jobs.findOrCreateActiveJob({ ...request, entityId: randomUUID() }),
    ]);
    expect(new Set([first, ...differentScopes].map(job => job.id)).size).toBe(5);
    for (const status of ['completed', 'failed', 'superseded'] as const) {
      await db.update(translationJobs).set({ status }).where(eq(translationJobs.id, second.id));
      const replacement = await jobs.findOrCreateActiveJob(request);
      expect(replacement.id).not.toBe(second.id);
      expect(replacement.status).toBe('pending');
      second.id = replacement.id;
    }
  });

  it('더 최근의 다른 범위 작업이 있어도 기존 legacy Product bundle을 재사용한다', async () => {
    const entityId = randomUUID();
    const [legacy] = await db.insert(translationJobs).values({ entityType: 'Product', entityId }).returning();
    const narrow = await jobs.createJob({
      entityType: 'Product',
      entityId,
      fields: ['summary'],
    });
    const bundle = await jobs.findOrCreateActiveJob({
      entityType: 'Product',
      entityId,
      fields: ['features', 'name', 'description', 'summary'],
    });
    expect(bundle.id).toBe(legacy!.id);
    expect(bundle.fields).toBeNull();
    expect(
      (
        await jobs.findOrCreateActiveJob({
          entityType: 'Product',
          entityId,
          fields: ['summary'],
        })
      ).id
    ).toBe(narrow.id);
  });

  it.each(['Magazine', 'ProductFeature'] as const)('%s 범용 요청도 기존 활성 작업을 재사용한다', async entityType => {
    const { feature } = await seedProduct();
    const [magazine] = await db
      .insert(magazines)
      .values({
        title: '제목',
        summary: '요약',
        content: '본문',
        slug: randomUUID(),
        backgroundImageUrl: 'https://example.com/background.png',
        authorId: 'synthetic',
      })
      .returning();
    const entityId = entityType === 'Magazine' ? magazine!.id : feature.id;
    const fields = entityType === 'Magazine' ? ['title', 'summary'] : ['name', 'summary'];
    const queue = { sendJob: vi.fn().mockResolvedValue(true) };
    const service = new TranslationJobService(
      {} as never,
      {} as never,
      jobs,
      store,
      queue as unknown as TranslationQueueService
    );
    const first = await service.requestTranslationJob(entityType, entityId, fields);
    const second = await service.requestTranslationJob(entityType, entityId, [...fields].reverse());
    expect(first.id).toBe(second.id);
    expect(queue.sendJob).toHaveBeenCalledTimes(2);
    expect(await db.select().from(translationJobs).where(eq(translationJobs.entityId, entityId))).toHaveLength(1);
  });

  it('같은 작업의 중복 큐 전달은 한 attempt만 실행하고 실행 중 요청은 다시 전송하지 않는다', async () => {
    const { feature } = await seedProduct();
    const entered = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();
    const provider = {
      translateSingle: vi.fn(async () => {
        entered.resolve();
        await finish.promise;
        return {
          translatedText: 'Feature name',
          sourceHash: 'untrusted',
          model: 'fixture-model',
          promptVersion: 'v2',
        };
      }),
      translateProductBundle: vi.fn(),
    };
    const queue = { sendJob: vi.fn().mockResolvedValue(true) };
    const services = [db, writerDb].map(
      database =>
        new TranslationJobService(
          {} as never,
          provider,
          new PostgresqlTranslationJobRepository(database as never),
          new PostgresqlTranslationSourceStore(database as never),
          queue as unknown as TranslationQueueService
        )
    );
    const requested = await services[0]!.requestTranslationJob('ProductFeature', feature.id, ['name']);
    expect((await services[1]!.requestTranslationJob('ProductFeature', feature.id, ['name'])).id).toBe(requested.id);
    expect(queue.sendJob).toHaveBeenCalledTimes(2);
    const identity = { entityType: 'ProductFeature', entityId: feature.id };
    const running = services[0]!.executeTranslationJob(requested.id, identity, {
      leaseToken: 'first-delivery',
    });
    try {
      await entered.promise;
      await services[1]!.executeTranslationJob(requested.id, identity, {
        leaseToken: 'duplicate-delivery',
      });
      const active = await services[1]!.requestTranslationJob('ProductFeature', feature.id, ['name']);
      expect(active).toMatchObject({
        id: requested.id,
        status: 'in_progress',
        attemptCount: 1,
        queued: true,
      });
      expect(queue.sendJob).toHaveBeenCalledTimes(2);
      expect(provider.translateSingle).toHaveBeenCalledTimes(1);
    } finally {
      finish.resolve();
      await running;
    }
    expect(await jobs.findJobById(requested.id)).toMatchObject({
      status: 'completed',
      attemptCount: 1,
    });
    expect(await repository.findByEntity({ ...identity, locale: 'en' })).toMatchObject([
      { field: 'name', value: 'Feature name' },
    ]);
  });

  it('수동 활성 작업이 있어도 새 canonical revision의 자동 번역 등록과 supersede를 유지한다', async () => {
    const { product } = await seedProduct();
    const fields = ['name', 'summary', 'description', 'features'];
    const manual = await jobs.findOrCreateActiveJob({
      entityType: 'Product',
      entityId: product.id,
      fields,
    });
    const write = (changes: Partial<typeof products.$inferInsert>) =>
      writerDb.transaction(async tx => {
        await lockProductSource(tx as never, product.id);
        const finish = await beginProductContentWrite(tx as never, product.id);
        await tx.update(products).set(changes).where(eq(products.id, product.id));
        await finish();
      });
    await write({ publishedAt: new Date() });
    const [first] = await db
      .select()
      .from(productContentSyncIntents)
      .where(
        and(eq(productContentSyncIntents.productId, product.id), eq(productContentSyncIntents.kind, 'translation'))
      );
    expect(first!.translationJobId).not.toBe(manual.id);
    expect(first!.sourceRevision).toBe(1n);
    expect(
      (
        await jobs.findOrCreateActiveJob({
          entityType: 'Product',
          entityId: product.id,
          fields,
        })
      ).id
    ).toBe(first!.translationJobId);
    await write({ summary: '새 revision의 요약' });
    const intents = await db
      .select()
      .from(productContentSyncIntents)
      .where(
        and(eq(productContentSyncIntents.productId, product.id), eq(productContentSyncIntents.kind, 'translation'))
      );
    const latest = intents.find(intent => intent.sourceRevision === 2n)!;
    expect(latest.translationJobId).not.toBe(first!.translationJobId);
    expect(await jobs.findJobById(first!.translationJobId!)).toMatchObject({
      status: 'superseded',
    });
    expect(await jobs.findJobById(latest.translationJobId!)).toMatchObject({
      status: 'pending',
    });
    expect(await jobs.findJobById(manual.id)).toMatchObject({
      status: 'pending',
    });
    expect(
      (
        await jobs.findOrCreateActiveJob({
          entityType: 'Product',
          entityId: product.id,
          fields,
        })
      ).id
    ).toBe(latest.translationJobId);
  });

  it.each([
    ['Product', 'description'],
    ['Magazine', 'content'],
  ] as const)(
    '%s %s whitespace edits invalidate public reads and freshness; retranslation recovers',
    async (entityType, field) => {
      const { product } = await seedProduct();
      const [magazine] = await db
        .insert(magazines)
        .values({
          title: '제목',
          summary: '요약',
          content: '    코드 ',
          backgroundImageUrl: 'https://example.com/background.png',
          authorId: 'author',
          slug: randomUUID(),
        })
        .returning();
      const entityId = entityType === 'Product' ? product.id : magazine!.id;
      const update = async (value: string) => {
        if (entityType === 'Product')
          await db.update(products).set({ description: value }).where(eq(products.id, entityId));
        else await db.update(magazines).set({ content: value }).where(eq(magazines.id, entityId));
      };
      const service = new TranslationService(repository);
      const resolver = new TranslationQueryResolver({} as never, repository, store);
      const read = (koreanValue: string) =>
        service.getTranslation({
          entityType,
          entityId,
          field,
          locale: 'en',
          koreanValue,
        });
      const freshness = async () => (await resolver.translationFreshness(entityType, entityId, [field]))[0]!.status;
      await update('    코드 ');
      const input = await attempt(entityType, entityId, [field]);
      expect(await store.commit(input)).toBe('completed');
      expect(await read('    코드 ')).toBe(`English ${field}`);
      expect(await freshness()).toBe('current');
      for (const changed of ['코드 ', '    코드']) {
        await update(changed);
        expect(await read(changed)).toBe(changed);
        expect(await freshness()).toBe('stale');
      }
      const retried = await attempt(entityType, entityId, [field]);
      expect(await store.commit(retried)).toBe('completed');
      expect(await read('    코드')).toBe(`English ${field}`);
      expect(await freshness()).toBe('current');
      await repository.upsert({
        entityType,
        entityId,
        field,
        locale: 'en',
        value: 'Legacy English',
        sourceHash: createHash('sha256').update('코드').digest('hex'),
        model: 'legacy',
        promptVersion: 'legacy',
      });
      await update('코드');
      expect(await read('코드')).toBe('코드');
      expect(await freshness()).toBe('stale');
    }
  );

  it('source/token/全rows/completed를 한 commit으로 저장하며 실제 DB job hash는 server snapshot이다', async () => {
    const { product } = await seedProduct();
    const input = await attempt('Product', product.id, ['name', 'summary', 'description', 'features']);
    expect(await store.commit(input)).toBe('completed');
    const job = await jobs.findJobById(input.job.id);
    expect(job).toMatchObject({
      status: 'completed',
      sourceHash: input.snapshot.sourceHash,
      fields: ['name', 'summary', 'description', 'features'],
      model: 'verified-model',
    });
    const rows = await db.select().from(translations);
    const own = rows.filter(row =>
      input.rows.some(expected => row.entityType === expected.entityType && row.entityId === expected.entityId)
    );
    expect(own).toHaveLength(5);
    expect(
      own.every(
        row =>
          /^(document:v1:)?[a-f\d]{64}$/.test(row.sourceHash!) &&
          row.model === 'verified-model' &&
          row.promptVersion === 'verified-version'
      )
    ).toBe(true);
  });

  it.each(['edit', 'phantom', 'token', 'expiry'] as const)(
    '%s가 바뀌면 row 0건이고 기존 영어는 보존한다',
    async change => {
      const { product } = await seedProduct();
      const input = await attempt('Product', product.id, ['name', 'summary', 'description', 'features']);
      await repository.upsert({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        field: 'name',
        value: 'Prior human-approved English',
        sourceHash: 'prior-hash',
        model: 'prior-model',
        promptVersion: 'prior-version',
      });
      if (change === 'edit')
        await writerDb.transaction(async tx => {
          await lockProductSource(tx as never, product.id);
          await tx.update(products).set({ description: '후속 사람 편집' }).where(eq(products.id, product.id));
        });
      if (change === 'phantom')
        await writerDb.transaction(async tx => {
          await lockProductSource(tx as never, product.id);
          await tx
            .insert(productFeatures)
            .values({ productId: product.id, name: '새 기능', summary: '새 조건', emoji: '🔎' });
        });
      if (change === 'token')
        await db.update(translationJobs).set({ leaseToken: 'replacement' }).where(eq(translationJobs.id, input.job.id));
      if (change === 'expiry')
        await db
          .update(translationJobs)
          .set({ leaseUntil: new Date(0) })
          .where(eq(translationJobs.id, input.job.id));
      expect(await store.commit(input)).toBe(change === 'edit' || change === 'phantom' ? 'superseded' : 'lease_lost');
      expect(
        await repository.findByEntity({ entityType: 'Product', entityId: product.id, locale: 'en' })
      ).toMatchObject([{ value: 'Prior human-approved English', sourceHash: 'prior-hash' }]);
    }
  );

  it('terminal marker 실패는 이미 삽입한 모든 row를 rollback한다', async () => {
    const { product } = await seedProduct();
    const input = await attempt('Product', product.id, ['name', 'summary']);
    await connection`CREATE FUNCTION fail_translation_terminal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status = 'completed' THEN RAISE EXCEPTION 'terminal rollback'; END IF; RETURN NEW; END $$`;
    await connection`CREATE TRIGGER fail_translation_terminal BEFORE UPDATE ON translation_jobs FOR EACH ROW EXECUTE FUNCTION fail_translation_terminal()`;
    try {
      const failure = await store.commit(input).catch(error => error);
      expect(failure).toBeInstanceOf(Error);
      expect(failure.cause.message).toContain('terminal rollback');
    } finally {
      await connection`DROP TRIGGER fail_translation_terminal ON translation_jobs`;
      await connection`DROP FUNCTION fail_translation_terminal()`;
    }
    expect(await repository.findByEntity({ entityType: 'Product', entityId: product.id, locale: 'en' })).toEqual([]);
    expect((await jobs.findJobById(input.job.id))?.status).toBe('in_progress');
  });

  it('불완전한 field와 source 읽기 실패를 commit 전에 거부한다', async () => {
    const { product } = await seedProduct();
    const input = await attempt('Product', product.id, ['name', 'summary']);
    await expect(store.commit({ ...input, rows: input.rows.slice(0, 1) })).rejects.toThrow(/Incomplete/);
    await expect(store.commit({ ...input, snapshot: { ...input.snapshot, entityId: 'missing' } })).rejects.toThrow();
    expect(await repository.findByEntity({ entityType: 'Product', entityId: product.id, locale: 'en' })).toEqual([]);
  });

  it('Magazine와 ProductFeature도 stale source를 같은 commit에서 거부한다', async () => {
    const [magazine] = await db
      .insert(magazines)
      .values({
        title: '잡지',
        summary: '조건',
        content: '본문',
        slug: randomUUID(),
        backgroundImageUrl: 'https://example.com/background.png',
        authorId: 'synthetic',
      })
      .returning();
    const magazineInput = await attempt('Magazine', magazine!.id, ['title', 'summary', 'content']);
    await writerDb.update(magazines).set({ summary: '변경' }).where(eq(magazines.id, magazine!.id));
    expect(await store.commit(magazineInput)).toBe('superseded');
    const { product, feature } = await seedProduct();
    const featureInput = await attempt('ProductFeature', feature.id, ['name', 'summary']);
    await writerDb.transaction(async tx => {
      await lockProductSource(tx as never, product.id);
      await tx.update(productFeatures).set({ summary: '변경' }).where(eq(productFeatures.id, feature.id));
    });
    expect(await store.commit(featureInput)).toBe('superseded');
    expect(await repository.findByEntity({ entityType: 'ProductFeature', entityId: feature.id, locale: 'en' })).toEqual(
      []
    );
  });

  it.each(['sourceHash', 'model', 'promptVersion'] as const)(
    '단건/배치 %s 누락/null value 변경을 거부하고 같은 값 no-op은 #429 provenance를 보존한다',
    async missing => {
      const { product } = await seedProduct();
      const valid = {
        entityType: 'Product',
        entityId: product.id,
        field: 'name',
        locale: 'en',
        value: 'Old English',
        sourceHash: 'existing-hash',
        model: 'existing-model',
        promptVersion: 'existing-version',
      };
      await repository.upsert(valid);
      for (const value of [undefined, null]) {
        const invalid = { ...valid, value: 'Changed', [missing]: value } as unknown as UpsertTranslationParams;
        await expect(repository.upsert(invalid)).rejects.toThrow(/require sourceHash, model and promptVersion/);
        await expect(
          repository.upsertMany([{ ...valid, field: 'summary', value: 'New summary' }, invalid])
        ).rejects.toThrow();
        await repository.upsert({ ...invalid, value: 'Old English' });
      }
      const rows = await repository.findByEntity({ entityType: 'Product', entityId: product.id, locale: 'en' });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject(valid);
      await expect(
        repository.upsert({ ...valid, field: 'summary', model: null } as unknown as UpsertTranslationParams)
      ).rejects.toThrow();
    }
  );

  it('legacy Product NULL fields를 bundle로 읽고 실제 provider → service → transaction을 실행한다', async () => {
    const { product } = await seedProduct();
    const [job] = await db.insert(translationJobs).values({ entityType: 'Product', entityId: product.id }).returning();
    const llm = {
      getConfig: vi.fn().mockResolvedValue({ model: 'actual-provider-test' }),
      completion: vi.fn().mockImplementation(async (_model, messages) => {
        const json = messages[1].content.split('번역할 원본 데이터 (JSON):\n')[1].split('\n\n검토할 번역 초안:')[0];
        return {
          content: json
            .replaceAll('이름', 'Name')
            .replaceAll('요약', 'Summary')
            .replaceAll('설명', 'Description')
            .replaceAll('기능', 'Feature')
            .replaceAll('조건', 'Condition'),
        };
      }),
    };
    Container.set(TranslationProviderToken, new LlmTranslationProvider(llm as unknown as LlmClient));
    const service = new TranslationJobService(
      { execute: vi.fn() } as unknown as GetProduct,
      Container.get(TranslationProviderToken),
      jobs,
      store,
      { sendJob: vi.fn() } as unknown as TranslationQueueService
    );
    await service.executeProductTranslationJob(job!.id, product.id);
    expect((await jobs.findJobById(job!.id))?.status).toBe('completed');
    expect(
      (await repository.findByEntity({ entityType: 'Product', entityId: product.id, locale: 'en' })).find(
        row => row.field === 'description'
      )?.value
    ).toBe('<p>Description</p>');
    expect(llm.completion).toHaveBeenCalledTimes(2);
  });

  it('동일 token의 동시 완료도 한 번만 저장한다', async () => {
    const { product } = await seedProduct();
    const input = await attempt('Product', product.id, ['name', 'summary']);
    expect((await Promise.all([store.commit(input), store.commit(input)])).sort()).toEqual(['completed', 'lease_lost']);
    expect(await repository.findByEntity({ entityType: 'Product', entityId: product.id, locale: 'en' })).toHaveLength(
      2
    );
  });

  it('field 일부의 실제 provider 실패는 기존 영어와 provenance를 보존한다', async () => {
    const [magazine] = await db
      .insert(magazines)
      .values({
        title: '잡지',
        summary: '조건',
        slug: randomUUID(),
        backgroundImageUrl: 'https://example.com/background.png',
        authorId: 'synthetic',
      })
      .returning();
    const prior = {
      entityType: 'Magazine',
      entityId: magazine!.id,
      field: 'title',
      locale: 'en',
      value: 'Prior reviewed title',
      sourceHash: 'prior-hash',
      model: 'prior-model',
      promptVersion: 'prior-version',
    };
    await repository.upsert(prior);
    const job = await jobs.createJob({ entityType: 'Magazine', entityId: magazine!.id, fields: ['title', 'summary'] });
    const llm = {
      getConfig: vi.fn().mockResolvedValue({ model: 'provider-test' }),
      completion: vi
        .fn()
        .mockResolvedValueOnce({ content: 'Magazine' })
        .mockResolvedValueOnce({ content: 'Reviewed magazine' })
        .mockRejectedValueOnce(new Error('summary failed')),
    };
    const service = new TranslationJobService(
      { execute: vi.fn() } as unknown as GetProduct,
      new LlmTranslationProvider(llm as unknown as LlmClient),
      jobs,
      store,
      { sendJob: vi.fn() } as unknown as TranslationQueueService
    );
    await service.executeTranslationJob(job.id, { entityType: 'Magazine', entityId: magazine!.id });
    expect((await jobs.findJobById(job.id))?.status).toBe('failed');
    const rows = await repository.findByEntity({ entityType: 'Magazine', entityId: magazine!.id, locale: 'en' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject(prior);
  });

  it('features-only 빈 목록도 bundle context로 완료하고 요청하지 않은 Product row는 쓰지 않는다', async () => {
    const { product } = await seedProduct();
    await db.delete(productFeatures).where(eq(productFeatures.productId, product.id));
    const job = await jobs.createJob({ entityType: 'Product', entityId: product.id, fields: ['features'] });
    const llm = {
      getConfig: vi.fn().mockResolvedValue({ model: 'provider-test' }),
      completion: vi.fn().mockImplementation(async (_model, messages) => {
        const json = messages[1].content.split('번역할 원본 데이터 (JSON):\n')[1].split('\n\n검토할 번역 초안:')[0];
        return {
          content: json.replaceAll('이름', 'Name').replaceAll('요약', 'Summary').replaceAll('설명', 'Description'),
        };
      }),
    };
    const service = new TranslationJobService(
      { execute: vi.fn() } as unknown as GetProduct,
      new LlmTranslationProvider(llm as unknown as LlmClient),
      jobs,
      store,
      { sendJob: vi.fn() } as unknown as TranslationQueueService
    );
    await service.executeProductTranslationJob(job.id, product.id);
    expect((await jobs.findJobById(job.id))?.status).toBe('completed');
    expect(await repository.findByEntity({ entityType: 'Product', entityId: product.id, locale: 'en' })).toEqual([]);
  });

  it('source mutex를 기다린 번역 commit은 선행 writer가 저장한 최신 source를 본다', async () => {
    const { product } = await seedProduct();
    const input = await attempt('Product', product.id, ['name', 'summary']);
    const locked = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const write = writerDb.transaction(async tx => {
      await lockProductSource(tx as never, product.id);
      locked.resolve();
      await release.promise;
      await tx.update(products).set({ summary: 'writer commit' }).where(eq(products.id, product.id));
    });
    await locked.promise;
    const commit = store.commit(input);
    let waiting = false;
    try {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const blocked =
          await connection`SELECT 1 FROM pg_stat_activity WHERE application_name = ${`${applicationName}-reader`} AND wait_event_type = 'Lock'`;
        if (blocked.length) {
          waiting = true;
          break;
        }
        await yieldImmediate();
      }
    } finally {
      release.resolve();
    }
    await write;
    expect(waiting).toBe(true);
    expect(await commit).toBe('superseded');
  });

  // Synthetic transport only: the real Provider, codec and PostgreSQL commit run unchanged.
  const translateTransport = (model: string, mappings: ReadonlyArray<readonly [string, string]>) => ({
    getConfig: async () => ({ model }),
    completion: async (_model: string, messages: Array<{ content: string }>) => {
      const prompt = messages[1]!.content;
      const source = prompt.includes('번역할 원본 데이터 (JSON):')
        ? prompt.split('번역할 원본 데이터 (JSON):\n')[1]!.split('\n\n검토할 번역 초안:')[0]!
        : prompt.includes('[영어 번역 초안]\n')
          ? prompt.split('[영어 번역 초안]\n')[1]!
          : prompt.split('번역할 원문:\n')[1]!;
      return { content: mappings.reduce((out, [from, to]) => out.replaceAll(from, to), source) };
    },
  });

  it('bundle name/summary/features의 들여쓰기·backtick·fence 원문은 번역 영어로 전체 rows에 저장된다', async () => {
    const name = `translation_plain_${randomUUID().replaceAll('-', '')}`;
    const [product] = await db
      .insert(products)
      .values({
        name: '    들여쓰기 제품명',
        summary: '`백틱 요약` 정상 문장',
        description: '<p>설명 <code>literal-code</code> 한국어</p>',
        logoUrl: 'https://example.com/logo.png',
        slug: name,
        categoryIds: [],
      })
      .returning();
    const [feature] = await db
      .insert(productFeatures)
      .values({ productId: product!.id, name: '```펜스 기능명```', summary: '    들여쓰기 기능 요약', emoji: '🔎' })
      .returning();
    const [job] = await db.insert(translationJobs).values({ entityType: 'Product', entityId: product!.id }).returning();
    const service = new TranslationJobService(
      { execute: vi.fn() } as unknown as GetProduct,
      new LlmTranslationProvider(
        translateTransport('bundle-model', [
          ['    들여쓰기 제품명', 'Indented product name'],
          ['`백틱 요약` 정상 문장', '`Backtick summary` normal sentence'],
          ['설명', 'Description'],
          ['한국어', 'Korean'],
          ['```펜스 기능명```', '```Fenced feature name```'],
          ['    들여쓰기 기능 요약', 'Indented feature summary'],
        ]) as unknown as LlmClient
      ),
      jobs,
      store,
      { sendJob: vi.fn() } as unknown as TranslationQueueService
    );
    await service.executeProductTranslationJob(job!.id, product!.id);
    expect((await jobs.findJobById(job!.id))?.status).toBe('completed');
    const rows = await repository.findByEntity({ entityType: 'Product', entityId: product!.id, locale: 'en' });
    const featureRows = await repository.findByEntity({
      entityType: 'ProductFeature',
      entityId: feature!.id,
      locale: 'en',
    });
    expect(rows).toHaveLength(3);
    expect(featureRows).toHaveLength(2);
    expect(rows.find(row => row.field === 'name')).toMatchObject({
      value: 'Indented product name',
      sourceHash: computeSourceHash('    들여쓰기 제품명'),
      model: 'bundle-model',
      promptVersion: 'v2.0.0',
    });
    expect(rows.find(row => row.field === 'summary')).toMatchObject({
      value: '`Backtick summary` normal sentence',
      sourceHash: computeSourceHash('`백틱 요약` 정상 문장'),
    });
    // Document description keeps its real code literal while surrounding Korean is translated.
    expect(rows.find(row => row.field === 'description')).toMatchObject({
      value: '<p>Description <code>literal-code</code> Korean</p>',
      sourceHash: computeSourceHash('<p>설명 <code>literal-code</code> 한국어</p>', 'description'),
    });
    expect(featureRows.find(row => row.field === 'name')).toMatchObject({
      value: '```Fenced feature name```',
      sourceHash: computeSourceHash('```펜스 기능명```'),
    });
    expect(featureRows.find(row => row.field === 'summary')).toMatchObject({
      value: 'Indented feature summary',
      sourceHash: computeSourceHash('    들여쓰기 기능 요약'),
    });
    for (const row of [...rows, ...featureRows])
      expect(row).toMatchObject({ model: 'bundle-model', promptVersion: 'v2.0.0' });
  });

  it.each([
    ['    고정 코드\n\n설명  \n', '    고정 코드\n\nDescription  \n'],
    ['    고정 코드만  \n', '    고정 코드만  \n'],
    ['설명  \n다음 줄  ', 'Description  \n다음 줄  '],
    ['    \u00a0\n', '', '    \u00a0\n'],
    ['\t\u00a0\n', '', '\t\u00a0\n'],
  ])(
    'bundle 번역의 문서 공백을 commit하고 공개 영어로 그대로 조회한다: %j',
    async (description, expected, publicValue = expected) => {
      const { product } = await seedProduct();
      await db.update(products).set({ description }).where(eq(products.id, product.id));
      const job = await jobs.createJob({
        entityType: 'Product',
        entityId: product.id,
        fields: ['name', 'summary', 'description', 'features'],
      });
      const service = new TranslationJobService(
        { execute: vi.fn() } as unknown as GetProduct,
        new LlmTranslationProvider(
          translateTransport('whitespace-model', [
            ['이름', 'Name'],
            ['요약', 'Summary'],
            ['설명', 'Description'],
            ['기능', 'Feature'],
            ['조건', 'Condition'],
          ]) as unknown as LlmClient
        ),
        jobs,
        store,
        { sendJob: vi.fn() } as unknown as TranslationQueueService
      );
      await service.executeProductTranslationJob(job.id, product.id);
      expect((await jobs.findJobById(job.id))?.status).toBe('completed');
      const row = await repository.findOne({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        field: 'description',
      });
      expect(row).toMatchObject({
        value: expected,
        sourceHash: `document:v1:${createHash('sha256').update(description).digest('hex')}`,
        model: 'whitespace-model',
        promptVersion: 'v2.0.0',
      });
      const english = await new TranslationService(repository).getTranslation({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        field: 'description',
        koreanValue: description,
      });
      expect(english).toBe(publicValue);
      expect(() => assertDocumentStructure(description, english)).not.toThrow();
    }
  );

  const translationRowsByField = async (entityType: string, entityId: string) =>
    Object.fromEntries(
      (await repository.findByEntity({ entityType, entityId, locale: 'en' })).map(row => [row.field, row])
    );

  it('Product 단건과 ProductFeature·Magazine 일반 텍스트도 placeholder 없이 번역 row로 저장한다', async () => {
    const [product] = await db
      .insert(products)
      .values({
        name: '    들여쓰기 제품명',
        summary: '`백틱 요약` 정상 문장',
        description: '<p>설명</p>',
        logoUrl: 'https://example.com/logo.png',
        slug: randomUUID(),
        categoryIds: [],
      })
      .returning();
    const [feature] = await db
      .insert(productFeatures)
      .values({ productId: product!.id, name: '```펜스 기능명```', summary: '    들여쓰기 기능 요약', emoji: '🔎' })
      .returning();
    const [magazine] = await db
      .insert(magazines)
      .values({
        title: '    들여쓰기 잡지 제목',
        summary: '`백틱 잡지 요약`',
        content: '본문',
        slug: randomUUID(),
        backgroundImageUrl: 'https://example.com/background.png',
        authorId: 'synthetic',
      })
      .returning();
    const llm = translateTransport('single-model', [
      ['    들여쓰기 제품명', 'Indented product name'],
      ['`백틱 요약` 정상 문장', '`Backtick summary` normal sentence'],
      ['```펜스 기능명```', '```Fenced feature name```'],
      ['    들여쓰기 기능 요약', 'Indented feature summary'],
      ['    들여쓰기 잡지 제목', 'Indented magazine title'],
      ['`백틱 잡지 요약`', '`Backtick magazine summary`'],
    ]);
    const service = new TranslationJobService(
      { execute: vi.fn() } as unknown as GetProduct,
      new LlmTranslationProvider(llm as unknown as LlmClient),
      jobs,
      store,
      { sendJob: vi.fn() } as unknown as TranslationQueueService
    );
    const productJob = await jobs.createJob({
      entityType: 'Product',
      entityId: product!.id,
      fields: ['name', 'summary'],
    });
    await service.executeTranslationJob(productJob.id, { entityType: 'Product', entityId: product!.id });
    const featureJob = await jobs.createJob({
      entityType: 'ProductFeature',
      entityId: feature!.id,
      fields: ['name', 'summary'],
    });
    await service.executeTranslationJob(featureJob.id, { entityType: 'ProductFeature', entityId: feature!.id });
    const magazineJob = await jobs.createJob({
      entityType: 'Magazine',
      entityId: magazine!.id,
      fields: ['title', 'summary'],
    });
    await service.executeTranslationJob(magazineJob.id, { entityType: 'Magazine', entityId: magazine!.id });
    for (const job of [productJob, featureJob, magazineJob])
      expect((await jobs.findJobById(job.id))?.status).toBe('completed');
    const productRows = await translationRowsByField('Product', product!.id);
    const featureRows = await translationRowsByField('ProductFeature', feature!.id);
    const magazineRows = await translationRowsByField('Magazine', magazine!.id);
    expect(Object.keys(productRows).sort()).toEqual(['name', 'summary']);
    expect(Object.keys(featureRows).sort()).toEqual(['name', 'summary']);
    expect(Object.keys(magazineRows).sort()).toEqual(['summary', 'title']);
    expect(productRows['name']).toMatchObject({
      value: 'Indented product name',
      sourceHash: computeSourceHash('    들여쓰기 제품명'),
      model: 'single-model',
      promptVersion: 'v2.0.0',
    });
    expect(productRows['summary']).toMatchObject({
      value: '`Backtick summary` normal sentence',
      sourceHash: computeSourceHash('`백틱 요약` 정상 문장'),
      model: 'single-model',
      promptVersion: 'v2.0.0',
    });
    expect(featureRows['name']).toMatchObject({
      value: '```Fenced feature name```',
      sourceHash: computeSourceHash('```펜스 기능명```'),
      model: 'single-model',
      promptVersion: 'v2.0.0',
    });
    expect(featureRows['summary']).toMatchObject({
      value: 'Indented feature summary',
      sourceHash: computeSourceHash('    들여쓰기 기능 요약'),
      model: 'single-model',
      promptVersion: 'v2.0.0',
    });
    expect(magazineRows['title']).toMatchObject({
      value: 'Indented magazine title',
      sourceHash: computeSourceHash('    들여쓰기 잡지 제목'),
      model: 'single-model',
      promptVersion: 'v2.0.0',
    });
    expect(magazineRows['summary']).toMatchObject({
      value: '`Backtick magazine summary`',
      sourceHash: computeSourceHash('`백틱 잡지 요약`'),
      model: 'single-model',
      promptVersion: 'v2.0.0',
    });
  });

  const referenceSource = '[안내][] [안내] [본문][안내]\n\n[안내]: <https://example.com/guide?x=1&amp;y=2>';
  const referenceEnglish =
    '[Directions][안내] [Directions][안내] [Article][안내]\n\n[안내]: <https://example.com/guide?x=1&amp;y=2>';
  type ReferenceKind = 'bundle' | 'product' | 'magazine';
  async function referenceFixture(kind: ReferenceKind) {
    const { product, feature } = await seedProduct();
    if (kind === 'magazine') {
      const [magazine] = await db
        .insert(magazines)
        .values({
          title: '잡지',
          summary: '요약',
          content: referenceSource,
          slug: randomUUID(),
          backgroundImageUrl: 'https://example.com/background.png',
          authorId: 'synthetic',
        })
        .returning();
      return {
        entityType: 'Magazine' as const,
        entityId: magazine!.id,
        fields: ['content'],
        field: 'content',
        feature,
      };
    }
    await db.update(products).set({ description: referenceSource }).where(eq(products.id, product.id));
    return {
      entityType: 'Product' as const,
      entityId: product.id,
      fields: kind === 'bundle' ? ['name', 'summary', 'description', 'features'] : ['description'],
      field: 'description',
      feature,
    };
  }
  function referenceService(
    failure?: 'writer structure' | 'reviewer structure' | 'reviewer tokens' | 'reviewer failure'
  ) {
    const transport = translateTransport('reference-model', [
      ['안내', 'Guide draft'],
      ['본문', 'Article draft'],
      ['이름', 'Name'],
      ['요약', 'Summary'],
      ['기능', 'Feature'],
      ['조건', 'Condition'],
    ]);
    const llm = {
      getConfig: transport.getConfig,
      completion: async (model: string, messages: Array<{ content: string }>) => {
        const prompt = messages[1]!.content;
        const reviewer = prompt.includes('검토할 번역 초안:') || prompt.includes('[영어 번역 초안]');
        if (reviewer && failure === 'reviewer failure') throw new Error('reference reviewer failed');
        let { content } = await transport.completion(model, messages);
        if (reviewer) content = content.replaceAll('Guide draft', 'Directions').replaceAll('Article draft', 'Article');
        if (failure === (reviewer ? 'reviewer structure' : 'writer structure'))
          content = content.replace(reviewer ? 'Directions' : 'Guide draft', '**Broken**');
        if (reviewer && failure === 'reviewer tokens') content = content.replace(/⟦HTML_[^⟧]*⟧/, '');
        return { content };
      },
    };
    return new TranslationJobService(
      { execute: vi.fn() } as unknown as GetProduct,
      new LlmTranslationProvider(llm as unknown as LlmClient),
      jobs,
      store,
      { sendJob: vi.fn() } as unknown as TranslationQueueService
    );
  }

  it.each(['bundle', 'product', 'magazine'] as const)(
    '%s의 실제 Provider/codec 참조 번역은 영어·실제 source hash·전체 rows/completed로 원자 저장한다',
    async kind => {
      const fixture = await referenceFixture(kind);
      const snapshot = await store.read(fixture);
      const job = await jobs.createJob(fixture);
      const remote = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Remote translation forbidden'));
      try {
        await referenceService().executeTranslationJob(job.id, fixture);
        expect(remote).not.toHaveBeenCalled();
      } finally {
        remote.mockRestore();
      }
      expect(await jobs.findJobById(job.id)).toMatchObject({
        status: 'completed',
        attemptCount: 1,
        sourceHash: snapshot.sourceHash,
        model: 'reference-model',
        promptVersion: 'v2.0.0',
      });
      const rows = await repository.findByEntity({ ...fixture, locale: 'en' });
      expect(rows).toHaveLength(kind === 'bundle' ? 3 : 1);
      expect(rows.find(row => row.field === fixture.field)).toMatchObject({
        value: referenceEnglish,
        sourceHash: `document:v1:${createHash('sha256').update(referenceSource).digest('hex')}`,
        model: 'reference-model',
        promptVersion: 'v2.0.0',
      });
      if (kind === 'bundle') {
        expect(rows.find(row => row.field === 'name')).toMatchObject({
          value: 'Name',
          sourceHash: computeSourceHash('이름'),
        });
        expect(rows.find(row => row.field === 'summary')).toMatchObject({
          value: 'Summary',
          sourceHash: computeSourceHash('요약'),
        });
        const featureRows = await repository.findByEntity({
          entityType: 'ProductFeature',
          entityId: fixture.feature.id,
          locale: 'en',
        });
        expect(featureRows).toHaveLength(2);
        expect(featureRows.find(row => row.field === 'name')).toMatchObject({
          value: 'Feature',
          sourceHash: computeSourceHash('기능'),
        });
        expect(featureRows.find(row => row.field === 'summary')).toMatchObject({
          value: 'Condition',
          sourceHash: computeSourceHash('조건'),
        });
        for (const row of [...rows, ...featureRows])
          expect(row).toMatchObject({ model: 'reference-model', promptVersion: 'v2.0.0' });
      }
    }
  );

  it.each([
    ['bundle', 'writer structure'],
    ['bundle', 'reviewer tokens'],
    ['product', 'reviewer structure'],
    ['magazine', 'reviewer failure'],
  ] as const)('%s %s 실패는 모든 기존 영어/provenance와 과거 completed job을 보존한다', async (kind, failure) => {
    const fixture = await referenceFixture(kind);
    const priorJob = await jobs.createJob(fixture);
    await referenceService().executeTranslationJob(priorJob.id, fixture);
    const prior = await repository.findByEntity({ ...fixture, locale: 'en' });
    const priorFeatureRows = await repository.findByEntity({
      entityType: 'ProductFeature',
      entityId: fixture.feature.id,
      locale: 'en',
    });
    const completed = await jobs.findJobById(priorJob.id);
    expect(completed?.status).toBe('completed');
    expect(prior.find(row => row.field === fixture.field)?.value).toBe(referenceEnglish);
    const changed = referenceSource.replace('/guide?', '/updated?');
    if (kind === 'magazine')
      await db.update(magazines).set({ content: changed }).where(eq(magazines.id, fixture.entityId));
    else await db.update(products).set({ description: changed }).where(eq(products.id, fixture.entityId));
    const job = await jobs.createJob(fixture);
    await referenceService(failure).executeTranslationJob(job.id, fixture);
    expect((await jobs.findJobById(job.id))?.status).toBe('failed');
    expect(await repository.findByEntity({ ...fixture, locale: 'en' })).toEqual(prior);
    expect(
      await repository.findByEntity({
        entityType: 'ProductFeature',
        entityId: fixture.feature.id,
        locale: 'en',
      })
    ).toEqual(priorFeatureRows);
    expect(await jobs.findJobById(priorJob.id)).toEqual(completed);
  });

  it('일반 텍스트 번역 실패는 기존 영어와 provenance를 보존한다', async () => {
    const { feature } = await seedProduct();
    const prior = {
      entityType: 'ProductFeature',
      entityId: feature.id,
      field: 'name',
      locale: 'en',
      value: 'Prior reviewed feature name',
      sourceHash: 'prior-hash',
      model: 'prior-model',
      promptVersion: 'prior-version',
    };
    await repository.upsert(prior);
    await writerDb
      .update(productFeatures)
      .set({ name: '`백틱 기능명`', summary: '    들여쓰기 기능 요약' })
      .where(eq(productFeatures.id, feature.id));
    const job = await jobs.createJob({
      entityType: 'ProductFeature',
      entityId: feature.id,
      fields: ['name', 'summary'],
    });
    const llm = {
      getConfig: vi.fn().mockResolvedValue({ model: 'plain-failure-model' }),
      completion: vi
        .fn()
        .mockResolvedValueOnce({ content: '`Backtick feature name`' })
        .mockRejectedValueOnce(new Error('summary failed')),
    };
    const service = new TranslationJobService(
      { execute: vi.fn() } as unknown as GetProduct,
      new LlmTranslationProvider(llm as unknown as LlmClient),
      jobs,
      store,
      { sendJob: vi.fn() } as unknown as TranslationQueueService
    );
    await service.executeTranslationJob(job.id, { entityType: 'ProductFeature', entityId: feature.id });
    expect((await jobs.findJobById(job.id))?.status).toBe('failed');
    const rows = await repository.findByEntity({ entityType: 'ProductFeature', entityId: feature.id, locale: 'en' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject(prior);
  });
});
