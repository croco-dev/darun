import 'reflect-metadata';
import type { ApolloServer } from '@apollo/server';
import {
  ApplyProductDescriptionCandidate,
  UpdateProductScreenshot,
  DeleteProductScreenshot,
  CreateProductFlow,
  UpdateProductLink,
  UpdateProductTag,
  ProductTag,
  Tag,
  TagType,
  Product,
  ProductFeature,
  ProductLink,
  ProductScreenshot,
  ProductFlow,
  UpdateProductFeature,
  CreateProductFeature,
  CreateProduct,
  GetProduct,
  GetProductTags,
  GetProductFeature,
  ProductDescriptionApplyStoreToken,
  ProductResearchJobRepositoryToken,
  ProductResearchMaterializationRepositoryToken,
  CategoryRepositoryToken,
} from '@darun/products-domain';
import {
  ProductResearchReviewService,
  ProductResearchService,
  ProductResearchQueueService,
} from '@darun/products-service';
import { DrizzleToken } from '@darun/provider-database';
import { LlmSettingService } from '@darun/translation-service';
import { LlmClient } from '@darun/utils-llm';
import { asc, eq, inArray, sql as querySql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type * as GraphQL from 'graphql';
import postgres, { type Sql } from 'postgres';
import { buildSchemaSync } from 'type-graphql';
import { Container } from 'typedi';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { registerProductContentSync } from '../../../../../apps/graphql-api/src/adapters/PostgresqlProductContentSync';
import { translationJobs } from '../../../../translation/datasource/src/entities/TranslationJobSchema';
import { translations } from '../../../../translation/datasource/src/entities/TranslationSchema';
import { FeatureMutationResolver } from '../../../feature/src/Feature.mutation.resolver';
import { ProductQueryResolver } from '../../../feature/src/Product.query.resolver';
import { ProductPublishMutationResolver } from '../../../feature/src/ProductPublishMutationResolver';
import {
  ProductResearchMutationResolver,
  ProductResearchQueryResolver,
} from '../../../feature/src/ProductResearch.resolver';
import { categories } from '../entities/CategorySchema';
import { productContentSyncIntents } from '../entities/ProductContentSyncIntentSchema';
import { productDescriptionJobs } from '../entities/ProductDescriptionJobSchema';
import { productFeatures } from '../entities/ProductFeaturesSchema';
import { productLinks } from '../entities/ProductLinksSchema';
import { productResearchJobs } from '../entities/ProductResearchJobSchema';
import { products } from '../entities/ProductSchema';
import { productScreenshots } from '../entities/ProductScreenshotsSchema';
import { productTags } from '../entities/ProductTagsSchema';
import { tags } from '../entities/TagSchema';
import { PostgresqlCategoryRepository } from '../repositories/PostgresqlCategoryRepository';
import { PostgresqlProductDescriptionApplyStore } from '../repositories/PostgresqlProductDescriptionApplyStore';
import {
  PostgresqlProductDescriptionEvidenceAssembler,
  readProductDescriptionEvidenceSources,
} from '../repositories/PostgresqlProductDescriptionEvidenceAssembler';
import { PostgresqlProductFeatureRepository } from '../repositories/PostgresqlProductFeatureRepository';
import { PostgresqlProductFlowRepository } from '../repositories/PostgresqlProductFlowRepository';
import { PostgresqlProductLinkRepository } from '../repositories/PostgresqlProductLinkRepository';
import { PostgresqlProductRepository } from '../repositories/PostgresqlProductRepository';
import { PostgresqlProductResearchJobRepository } from '../repositories/PostgresqlProductResearchJobRepository';
import { PostgresqlProductResearchMaterializationRepository } from '../repositories/PostgresqlProductResearchMaterializationRepository';
import { PostgresqlProductScreenshotRepository } from '../repositories/PostgresqlProductScreenshotRepository';
import { PostgresqlProductTagRepository } from '../repositories/PostgresqlProductTagRepository';
import { ProductContentSyncRegistrarToken } from '../repositories/productContentSync';
import { lockProductSource } from '../repositories/productSourceMutex';
const { graphql } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;

const databaseUrl = process.env['ATOMIC_TEST_DATABASE_URL'];
const suite = databaseUrl ? describe : describe.skip;
const migrationsFolder = resolve(__dirname, '../../../../../apps/graphql-api/scripts/migrations');

suite('Product-first Apply and reviewed materialization (isolated PostgreSQL)', () => {
  let sql: Sql;
  let writerSql: Sql;
  let db: PostgresJsDatabase;
  let writerDb: PostgresJsDatabase;
  let sequence = 0;
  const prefix = `atomic-${randomUUID()}`;

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/darun_atomic_integrity') {
      throw new Error('Atomic tests require the isolated local darun_atomic_integrity database');
    }
    sql = postgres(databaseUrl!, {
      max: 6,
      prepare: false,
      connection: { statement_timeout: 10000, lock_timeout: 5000 },
    });
    writerSql = postgres(databaseUrl!, {
      max: 1,
      prepare: false,
      connection: { application_name: prefix, statement_timeout: 10000, lock_timeout: 5000 },
    });
    db = drizzle(sql);
    writerDb = drizzle(writerSql);
    Container.set(DrizzleToken, db);
    Container.set(ProductContentSyncRegistrarToken, { register: registerProductContentSync });
    // Main supplies a fresh local database; use the same migrator for clean install
    // and the upgrade fixtures below, never schema push or a mocked migration.
    await migrate(db, { migrationsFolder });
  }, 30_000);
  afterAll(async () => {
    Container.reset();
    await writerSql?.end({ timeout: 5 });
    await sql?.end({ timeout: 5 });
  });

  async function seed() {
    const [product] = await db
      .insert(products)
      .values({
        name: '제품',
        slug: `${prefix}-${sequence++}`,
        summary: '요약',
        logoUrl: 'https://example.com/logo.png',
        description: '<p>base</p>',
        categoryIds: [],
      })
      .returning();
    return product!;
  }
  async function screenshotFixture() {
    const product = await seed();
    const screens = await db
      .insert(productScreenshots)
      .values(
        [0, 1].map(index => ({
          productId: product.id,
          imageUrl: `https://example.com/screen-${index}.png`,
          imageAlt: `화면 ${index}`,
          platform: 'WEB',
          title: `기존 제목 ${index}`,
        }))
      )
      .returning();
    return { product, screens };
  }

  function screenshotUsecases(session = writerDb) {
    const screenshots = new PostgresqlProductScreenshotRepository(session as never);
    const flows = new PostgresqlProductFlowRepository(session as never);
    return {
      update: new UpdateProductScreenshot(screenshots),
      remove: new DeleteProductScreenshot(screenshots, flows),
      createFlow: new CreateProductFlow(flows),
    };
  }

  it('단일 연결 풀의 동시 스크린샷 플랫폼 수정과 삭제가 완료된다', async () => {
    const first = await screenshotFixture();
    const second = await screenshotFixture();
    const { update, remove } = screenshotUsecases();
    await Promise.all([
      update.execute({
        id: first.screens[0]!.id,
        imageAlt: '새 alt',
        platform: 'IOS',
      }),
      remove.execute(second.screens[0]!.id),
    ]);
    expect(
      await db.select().from(productScreenshots).where(eq(productScreenshots.id, first.screens[0]!.id))
    ).toMatchObject([{ platform: 'IOS', imageAlt: '새 alt' }]);
    expect(await db.select().from(productScreenshots).where(eq(productScreenshots.id, second.screens[0]!.id))).toEqual(
      []
    );
  }, 5000);

  it('단일 연결에서도 참조된 플랫폼 변경과 삭제는 rollback하고 같은 플랫폼 편집은 허용한다', async () => {
    const { product, screens } = await screenshotFixture();
    const { update, remove, createFlow } = screenshotUsecases();
    await createFlow.execute({
      productId: product.id,
      title: '가입 플로',
      description: '검증용',
      platform: 'WEB',
      flowType: 'SIGN_UP',
      steps: screens.map(screen => ({
        screenshotId: screen.id,
        caption: '',
      })),
    });
    const [before] = await db.select().from(products).where(eq(products.id, product.id));
    await expect(
      update.execute({
        id: screens[0]!.id,
        imageAlt: '거절할 alt',
        platform: 'IOS',
      })
    ).rejects.toMatchObject({ code: 'product-screenshot/in-use' });
    await expect(remove.execute(screens[0]!.id)).rejects.toMatchObject({
      code: 'product-screenshot/in-use',
    });
    const [after] = await db.select().from(products).where(eq(products.id, product.id));
    expect(after!.contentRevision).toBe(before!.contentRevision);
    expect(await db.select().from(productScreenshots).where(eq(productScreenshots.id, screens[0]!.id))).toMatchObject([
      { platform: 'WEB', imageAlt: '화면 0', title: '기존 제목 0' },
    ]);
    await expect(
      update.execute({
        id: screens[0]!.id,
        imageAlt: '새 alt',
        title: '새 제목',
        platform: 'WEB',
      })
    ).resolves.toMatchObject({
      platform: 'WEB',
      imageAlt: '새 alt',
      title: '새 제목',
    });
  }, 5000);

  it.each([
    { first: 'flow', change: 'platform' },
    { first: 'flow', change: 'delete' },
    { first: 'screenshot', change: 'platform' },
    { first: 'screenshot', change: 'delete' },
  ])('$first 선행·$change 경쟁에서도 플로 참조와 화면 분류가 일치한다', async ({ first, change }) => {
    const { product, screens } = await screenshotFixture();
    const secondSql = postgres(databaseUrl!, {
      max: 1,
      prepare: false,
      connection: { application_name: `${prefix}-second`, statement_timeout: 10000, lock_timeout: 5000 },
    });
    const secondDb = drizzle(secondSql);
    const create = (session: PostgresJsDatabase) =>
      screenshotUsecases(session).createFlow.execute({
        productId: product.id,
        title: '경쟁 플로',
        description: '',
        platform: 'WEB',
        flowType: 'SIGN_UP',
        steps: screens.map(screen => ({ screenshotId: screen.id, caption: '' })),
      });
    const modify = (session: PostgresJsDatabase) =>
      change === 'delete'
        ? screenshotUsecases(session).remove.execute(screens[0]!.id)
        : screenshotUsecases(session).update.execute({ id: screens[0]!.id, imageAlt: '변경 alt', platform: 'IOS' });
    let results: PromiseSettledResult<unknown>[] = [];
    let settled: Promise<PromiseSettledResult<unknown>[]> | undefined;
    try {
      await db.transaction(async tx => {
        await tx.select().from(products).where(eq(products.id, product.id)).for('update');
        const firstWrite = first === 'flow' ? create(writerDb) : modify(writerDb);
        settled = Promise.allSettled([firstWrite]);
        await waitForWriterLock();
        const secondWrite = first === 'flow' ? modify(secondDb) : create(secondDb);
        settled = Promise.allSettled([firstWrite, secondWrite]);
        const deadline = Date.now() + 3000;
        while (true) {
          const waiting = await sql`select 1 from pg_stat_activity
            where application_name = ${`${prefix}-second`} and wait_event_type = 'Lock'`;
          if (waiting.length) break;
          if (Date.now() > deadline) throw new Error('Second writer did not wait for Product lock');
          await new Promise<void>(resolve => setImmediate(resolve));
        }
      });
      results = await settled!;
      expect(results[0]!.status).toBe('fulfilled');
      expect(results[1]).toMatchObject({
        status: 'rejected',
        reason: { code: first === 'flow' ? 'product-screenshot/in-use' : 'product-flow/invalid-args' },
      });
      const storedFlows = await new PostgresqlProductFlowRepository(db as never).findManyByProductId(product.id);
      const storedScreen = await new PostgresqlProductScreenshotRepository(db as never).findById(screens[0]!.id);
      if (first === 'flow') {
        expect(storedFlows).toHaveLength(1);
        expect(storedScreen).toMatchObject({ platform: 'WEB', imageAlt: '화면 0' });
        expect(storedFlows[0]!.steps.map(step => step.screenshotId)).toEqual(screens.map(screen => screen.id));
      } else {
        expect(storedFlows).toEqual([]);
        if (change === 'delete') expect(storedScreen).toBeNull();
        else expect(storedScreen).toMatchObject({ platform: 'IOS', imageAlt: '변경 alt' });
      }
    } finally {
      await settled;
      await secondSql.end({ timeout: 5 });
    }
  });

  async function candidate(productId: string, version: 'v2' | null = 'v2') {
    const snapshot = await new PostgresqlProductDescriptionEvidenceAssembler(db as never).assemble(productId);
    const [job] = await db
      .insert(productDescriptionJobs)
      .values({
        productId,
        status: 'completed',
        evidenceHashVersion: version,
        evidenceHash: version === 'v2' ? snapshot.evidenceHash : snapshot.legacyEvidenceHash,
        baseDescriptionHash: snapshot.baseDescriptionHash,
        candidateHtml: '<blockquote>stored &amp; bytes</blockquote>',
        rendererVersion: version ?? 'v1',
      })
      .returning();
    return job!;
  }
  function apply(session = db) {
    return new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(session as never));
  }
  async function waitForWriterLock() {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const rows =
        await sql`select 1 from pg_stat_activity where application_name = ${prefix} and wait_event_type = 'Lock'`;
      if (rows.length) return;
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    throw new Error('Source writer did not wait for the Product mutex');
  }

  async function waitForMembershipGate(blockerPid: number) {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const waiting = await sql`
        select a.pid from pg_stat_activity a join pg_locks l on l.pid = a.pid
        where a.application_name = ${prefix} and l.locktype = 'advisory' and not l.granted
          and ${blockerPid} = any(pg_blocking_pids(a.pid))`;
      if (waiting.length) return;
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    throw new Error('Concurrent writer did not wait on the holding transaction membership gate');
  }

  async function categoryFixture() {
    const [category] = await db
      .insert(categories)
      .values({ slug: `${prefix}-${sequence++}`, labelKo: '이전 분류', labelEn: 'Old Category' })
      .returning();
    return category!;
  }

  async function publishedOwner(categoryIds: string[]) {
    const product = await seed();
    await new PostgresqlProductRepository(db as never).updateById(product.id, value => {
      value.update({ categoryIds });
      value.publish();
      return value;
    });
    await db.insert(translations).values({
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      field: 'description',
      value: '<p>Human-reviewed English</p>',
      sourceHash: 'preserved-source',
      model: 'preserved-model',
      promptVersion: 'preserved-prompt',
    });
    return product;
  }

  async function syncState(productIds: string[]) {
    const intents = await db
      .select()
      .from(productContentSyncIntents)
      .where(inArray(productContentSyncIntents.productId, productIds))
      .orderBy(
        asc(productContentSyncIntents.productId),
        asc(productContentSyncIntents.sourceRevision),
        asc(productContentSyncIntents.kind)
      );
    return {
      products: await db.select().from(products).where(inArray(products.id, productIds)).orderBy(asc(products.id)),
      search: intents.filter(intent => intent.kind === 'search'),
      translation: {
        intents: intents.filter(intent => intent.kind === 'translation'),
        jobs: await db
          .select()
          .from(translationJobs)
          .where(inArray(translationJobs.entityId, productIds))
          .orderBy(asc(translationJobs.id)),
        english: await db
          .select()
          .from(translations)
          .where(inArray(translations.entityId, productIds))
          .orderBy(asc(translations.id)),
      },
    };
  }

  it('태그 읽기 오류는 GraphQL 오류로 전달하고 기존 연결과 intent를 보존하며 재조회 후 삭제할 수 있다', async () => {
    const product = await publishedOwner([]);
    const repository = new PostgresqlProductTagRepository(db as never);
    const name = `preserved-${prefix}-${sequence++}`;
    await new UpdateProductTag(repository).execute({
      productId: product.id,
      tagNames: [name],
    });
    const before = await syncState([product.id]);
    const links = await db.select().from(productTags).where(eq(productTags.productId, product.id));
    const productRepository = new PostgresqlProductRepository(db as never);
    const getProduct = new GetProduct(productRepository);
    const getTags = new GetProductTags(repository);
    const query = new ProductQueryResolver(
      undefined!,
      undefined!,
      undefined!,
      getProduct,
      undefined!,
      undefined!,
      getTags,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      productRepository
    );
    const mutation = new ProductPublishMutationResolver(
      undefined!,
      undefined!,
      undefined!,
      new UpdateProductTag(repository),
      getProduct,
      getTags,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined!
    );
    const schema = buildSchemaSync({
      resolvers: [ProductQueryResolver, ProductPublishMutationResolver],
      container: {
        get: type => (type === ProductPublishMutationResolver ? mutation : query),
      },
      authChecker: () => true,
    });
    const read = () =>
      graphql({
        schema,
        source: 'query($slug: String!) { tempProductBySlug(slug: $slug) { id tags { id name } } }',
        variableValues: { slug: product.slug },
      });
    const failure = vi.spyOn(repository, 'findByProductIds').mockRejectedValueOnce(new Error('tag read failed'));
    try {
      const failed = await read();
      expect(failed.errors?.map(error => error.path)).toEqual([['tempProductBySlug', 'tags']]);
      expect(failed.data?.tempProductBySlug).toBeNull();
      expect(await db.select().from(productTags).where(eq(productTags.productId, product.id))).toEqual(links);
      expect(await syncState([product.id])).toEqual(before);

      const retried = await read();
      expect(retried.errors).toBeUndefined();
      expect(retried.data?.tempProductBySlug).toEqual({
        id: product.id,
        tags: [{ id: links[0]!.tagId, name }],
      });
      const cleared = await graphql({
        schema,
        source:
          'mutation($slug: String!) { updateProductTags(slug: $slug, input: { tagNames: [] }) { product { id tags { name } } } }',
        variableValues: { slug: product.slug },
      });
      expect(cleared.errors).toBeUndefined();
      expect(cleared.data?.updateProductTags).toEqual({
        product: { id: product.id, tags: [] },
      });
      expect(await db.select().from(productTags).where(eq(productTags.productId, product.id))).toEqual([]);
      const after = await syncState([product.id]);
      expect(after.products[0]!.contentRevision).toBe(before.products[0]!.contentRevision + BigInt(1));
      expect(after.search).toHaveLength(before.search.length + 1);
      expect(after.translation).toEqual(before.translation);
    } finally {
      failure.mockRestore();
    }
  });

  it('서로 다른 상품의 역순 태그 생성 경합이 canonical 태그 한 건씩으로 수렴한다', async () => {
    const first = await publishedOwner([]);
    const second = await publishedOwner([]);
    const before = await syncState([first.id, second.id]);
    const names = [`z-${prefix}-${sequence++}`, `a-${prefix}-${sequence++}`];
    const firstWriter = new PostgresqlProductTagRepository(db as never);
    const secondWriter = new PostgresqlProductTagRepository(writerDb as never);
    let writes: Promise<PromiseSettledResult<ProductTag>[]> | undefined;
    try {
      await db.transaction(async tx => {
        // SHARE permits both initial SELECTs but holds both INSERTs until they are observed.
        await tx.execute(querySql`lock table tags in share mode`);
        writes = Promise.allSettled([
          firstWriter.upsert(
            new ProductTag({
              productId: first.id,
              tags: names.map(name => new Tag({ name })),
            })
          ),
          secondWriter.upsert(
            new ProductTag({
              productId: second.id,
              tags: [...names].reverse().map(name => new Tag({ name })),
            })
          ),
        ]);
        const deadline = Date.now() + 3000;
        while (Date.now() < deadline) {
          const waiting = await sql`
            select a.pid from pg_stat_activity a
            where a.datname = current_database() and a.wait_event_type = 'Lock'
              and a.query like 'insert into "tags"%'
              and pg_backend_pid() <> a.pid`;
          if (waiting.length === 2) return;
          await new Promise<void>(resolve => setImmediate(resolve));
        }
        throw new Error('Both tag writers must reach their blocked INSERT before releasing the gate');
      });
      const results = await writes!;
      expect(results.map(result => result.status)).toEqual(['fulfilled', 'fulfilled']);
      const canonical = await db.select().from(tags).where(inArray(tags.name, names));
      expect(canonical.map(tag => tag.name).sort()).toEqual([...names].sort());
      for (const [index, product] of [first, second].entries()) {
        const linked = await db.select().from(productTags).where(eq(productTags.productId, product.id));
        expect(linked.map(link => link.tagId).sort()).toEqual(canonical.map(tag => tag.id).sort());
        const result = results[index]!;
        if (result.status === 'fulfilled') {
          expect(result.value.tags.map(tag => tag.id).sort()).toEqual(canonical.map(tag => tag.id).sort());
        }
      }
      const after = await syncState([first.id, second.id]);
      expect(after.products.map(product => product.contentRevision)).toEqual(
        before.products.map(product => product.contentRevision + BigInt(1))
      );
      expect(after.search).toHaveLength(before.search.length + 2);
      expect(after.translation).toEqual(before.translation);
    } finally {
      await writes;
    }
  });

  it('중복 태그 입력·기존 태그 재사용·빈 목록 교체에도 연결과 revision을 일관되게 유지한다', async () => {
    const product = await publishedOwner([]);
    const name = `duplicate-${prefix}-${sequence++}`;
    const repository = new PostgresqlProductTagRepository(db as never);
    const result = await repository.upsert(
      new ProductTag({
        productId: product.id,
        tags: [new Tag({ name }), new Tag({ name })],
      })
    );
    expect(result.tags).toHaveLength(1);
    const [canonical] = await db
      .update(tags)
      .set({ type: TagType.Featured, count: 17 })
      .where(eq(tags.name, name))
      .returning();
    expect(result.tags[0]?.id).toBe(canonical!.id);
    expect(await db.select().from(productTags).where(eq(productTags.productId, product.id))).toHaveLength(1);
    const before = await syncState([product.id]);
    await new UpdateProductTag(repository).execute({
      productId: product.id,
      tagNames: [name, name],
    });
    expect(await syncState([product.id])).toEqual(before);
    expect(await db.select().from(tags).where(eq(tags.name, name))).toEqual([canonical]);
    expect((await repository.findOneByProductId(product.id))?.tags).toEqual([
      expect.objectContaining({
        id: canonical!.id,
        name,
        type: TagType.Featured,
        count: 17,
      }),
    ]);
    await new UpdateProductTag(repository).execute({
      productId: product.id,
      tagNames: [],
    });
    expect(await repository.findOneByProductId(product.id)).toBeNull();
    expect(await db.select().from(tags).where(eq(tags.name, name))).toEqual([canonical]);
    const cleared = await syncState([product.id]);
    expect(cleared.products[0]?.contentRevision).toBe(before.products[0]!.contentRevision + BigInt(1));
    expect(cleared.search).toHaveLength(before.search.length + 1);
    expect(cleared.translation).toEqual(before.translation);
  });

  it('태그 교체의 intent INSERT 실패는 기존 연결·신규 태그·revision·intent를 모두 rollback한다', async () => {
    const product = await publishedOwner([]);
    const oldName = `old-${prefix}-${sequence++}`;
    const newName = `new-${prefix}-${sequence++}`;
    const repository = new PostgresqlProductTagRepository(db as never);
    await new UpdateProductTag(repository).execute({
      productId: product.id,
      tagNames: [oldName],
    });
    const before = await syncState([product.id]);
    const links = await db.select().from(productTags).where(eq(productTags.productId, product.id));
    await sql`create function atomic_fail_tag_intent() returns trigger language plpgsql as $$
      begin
        if new.product_id = current_setting('darun.tag_intent_failure', true) then
          raise exception 'injected tag intent failure';
        end if;
        return new;
      end $$`;
    await sql`create trigger atomic_fail_tag_intent before insert on product_content_sync_intents
      for each row execute function atomic_fail_tag_intent()`;
    try {
      await expect(
        db.transaction(async tx => {
          await tx.execute(querySql`select set_config('darun.tag_intent_failure', ${product.id}, true)`);
          await new UpdateProductTag(new PostgresqlProductTagRepository(tx as never)).execute({
            productId: product.id,
            tagNames: [newName],
          });
        })
      ).rejects.toMatchObject({
        cause: { message: 'injected tag intent failure' },
      });
      expect(await db.select().from(productTags).where(eq(productTags.productId, product.id))).toEqual(links);
      expect(await db.select().from(tags).where(eq(tags.name, newName))).toEqual([]);
      expect(await syncState([product.id])).toEqual(before);
    } finally {
      await sql`drop trigger atomic_fail_tag_intent on product_content_sync_intents`;
      await sql`drop function atomic_fail_tag_intent()`;
    }
    await new UpdateProductTag(repository).execute({
      productId: product.id,
      tagNames: [newName],
    });
    expect((await repository.findOneByProductId(product.id))?.tags.map(tag => tag.name)).toEqual([newName]);
  });

  it('다른 상품의 링크 수정은 두 상품의 링크와 revision·intent를 보존한다', async () => {
    const requested = await publishedOwner([]);
    const owner = await publishedOwner([]);
    const repository = new PostgresqlProductLinkRepository(db as never);
    const link = await repository.insert(
      new ProductLink({
        productId: owner.id,
        title: '원래 링크',
        link: 'https://example.com/original',
        displayLink: 'original',
        iconUrl: 'https://example.com/icon.png',
      })
    );
    const ids = [requested.id, owner.id];
    const before = await syncState(ids);
    const linksBefore = await db.select().from(productLinks).where(inArray(productLinks.productId, ids));
    const input = {
      productId: requested.id,
      linkId: link.id,
      title: '잘못된 수정',
    };

    await expect(new UpdateProductLink(repository).execute(input)).rejects.toThrow('product/invalid-args');

    expect(await syncState(ids)).toEqual(before);
    expect(await db.select().from(productLinks).where(inArray(productLinks.productId, ids))).toEqual(linksBefore);
  });

  it('같은 상품의 링크 수정은 해당 상품의 revision과 동기화 intent를 갱신한다', async () => {
    const owner = await publishedOwner([]);
    const repository = new PostgresqlProductLinkRepository(db as never);
    const link = await repository.insert(
      new ProductLink({
        productId: owner.id,
        title: '원래 링크',
        link: 'https://example.com/original',
        displayLink: 'original',
        iconUrl: 'https://example.com/icon.png',
      })
    );
    const before = await syncState([owner.id]);
    const input = {
      productId: owner.id,
      linkId: link.id,
      title: '새 링크',
      link: 'https://example.com/new',
    };

    const result = await new UpdateProductLink(repository).execute(input);

    expect(result).toMatchObject({
      id: link.id,
      productId: owner.id,
      title: '새 링크',
      link: 'https://example.com/new',
    });
    expect(await db.select().from(productLinks).where(eq(productLinks.id, link.id))).toMatchObject([
      {
        title: '새 링크',
        link: 'https://example.com/new',
        displayLink: 'original',
        productId: owner.id,
      },
    ]);
    const after = await syncState([owner.id]);
    expect(after.products[0]!.contentRevision).toBe(before.products[0]!.contentRevision + BigInt(1));
    expect(after.search[after.search.length - 1]).toMatchObject({
      sourceRevision: after.products[0]!.contentRevision,
      status: 'pending',
    });
  });

  it('없는 링크 수정은 not-found이며 revision과 intent를 보존한다', async () => {
    const owner = await publishedOwner([]);
    const before = await syncState([owner.id]);
    const input = {
      productId: owner.id,
      linkId: randomUUID(),
      title: '저장하지 않음',
    };
    await expect(
      new UpdateProductLink(new PostgresqlProductLinkRepository(db as never)).execute(input)
    ).rejects.toThrow('product/link-not-found');
    expect(await syncState([owner.id])).toEqual(before);
  });

  async function expectSearchRevisions(productId: string, revisions: bigint[]) {
    const state = await syncState([productId]);
    expect(state.products[0]?.contentRevision).toBe(revisions[revisions.length - 1]);
    expect(state.search.map(intent => ({ revision: intent.sourceRevision, status: intent.status }))).toEqual(
      revisions.map((revision, index) => ({
        revision,
        status: index === revisions.length - 1 ? 'pending' : 'superseded',
      }))
    );
  }

  async function publishedFeature() {
    const product = await seed();
    const [feature] = await db
      .insert(productFeatures)
      .values({
        productId: product.id,
        name: '기능',
        emoji: '🔎',
        summary: '기존 기능 요약',
      })
      .returning();
    await new PostgresqlProductRepository(db as never).updateById(product.id, value => {
      value.publish();
      return value;
    });
    return { product, feature: feature! };
  }

  it.each([
    { label: 'null은 삭제', input: { summary: null }, stored: null },
    { label: '생략은 보존', input: {}, stored: '기존 기능 요약' },
    {
      label: '문자열은 교체',
      input: { summary: '새 기능 요약' },
      stored: '새 기능 요약',
    },
    { label: '빈 문자열은 그대로 저장', input: { summary: '' }, stored: '' },
  ])('기능 요약 $label 계약을 실제 DB와 동기화 기록에 반영한다', async ({ input, stored }) => {
    const { product, feature } = await publishedFeature();
    const repository = new PostgresqlProductFeatureRepository(db as never);
    await repository.findManyByProductId(product.id);

    Container.set(
      FeatureMutationResolver,
      new FeatureMutationResolver(
        new CreateProductFeature(repository),
        new GetProduct(new PostgresqlProductRepository(db as never)),
        new GetProductFeature(repository),
        new UpdateProductFeature(repository)
      )
    );
    const schema = buildSchemaSync({
      resolvers: [FeatureMutationResolver, ProductResearchQueryResolver],
      container: Container,
      authChecker: () => true,
      validate: false,
    });
    const result = await graphql({
      schema,
      source: `mutation UpdateFeature($id: String!, $input: UpdateProductFeatureInput!) {
        updateProductFeature(id: $id, input: $input) { feature { id summary emoji } }
      }`,
      variableValues: { id: feature.id, input: { emoji: '✨', ...input } },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      updateProductFeature: {
        feature: { id: feature.id, summary: stored, emoji: '✨' },
      },
    });
    const [row] = await db.select().from(productFeatures).where(eq(productFeatures.id, feature.id));
    expect(row).toMatchObject({
      summary: stored,
      name: '기능',
      emoji: '✨',
    });
    expect((await repository.findOneById(feature.id))?.summary).toBe(stored ?? undefined);
    expect((await repository.findManyByProductId(product.id))[0]?.summary).toBe(stored ?? undefined);

    const revision = stored === feature.summary ? BigInt(1) : BigInt(2);
    const state = await syncState([product.id]);
    expect(state.products[0]?.contentRevision).toBe(revision);
    expect(state.search.filter(intent => intent.status === 'pending').map(intent => intent.sourceRevision)).toEqual([
      revision,
    ]);
    const pendingTranslations = state.translation.intents.filter(intent => intent.status === 'pending');
    expect(pendingTranslations.map(intent => intent.sourceRevision)).toEqual([revision]);
    expect(state.translation.jobs.filter(job => job.status === 'pending')).toEqual([
      expect.objectContaining({
        id: pendingTranslations[0]?.translationJobId,
        entityId: product.id,
        fields: ['name', 'summary', 'description', 'features'],
      }),
    ]);
  });

  it('기능 요약 삭제 후 번역 intent 저장이 실패하면 요약·revision·검색 intent·번역 job을 모두 rollback한다', async () => {
    const { product, feature } = await publishedFeature();
    const before = await syncState([product.id]);
    await sql`create function atomic_fail_feature_summary() returns trigger language plpgsql as $$
      begin
        if new.kind = 'translation' and new.product_id = current_setting('darun.feature_summary_failure', true) then
          raise exception 'injected feature summary intent failure';
        end if;
        return new;
      end $$`;
    await sql`create trigger atomic_fail_feature_summary before insert on product_content_sync_intents
      for each row execute function atomic_fail_feature_summary()`;
    try {
      await expect(
        db.transaction(async tx => {
          await tx.execute(querySql`select set_config('darun.feature_summary_failure', ${product.id}, true)`);
          await new UpdateProductFeature(new PostgresqlProductFeatureRepository(tx as never)).execute({
            featureId: feature.id,
            summary: null,
          });
        })
      ).rejects.toMatchObject({
        cause: { message: 'injected feature summary intent failure' },
      });
      expect((await db.select().from(productFeatures).where(eq(productFeatures.id, feature.id)))[0]).toEqual(feature);
      expect(await syncState([product.id])).toEqual(before);
    } finally {
      await sql`drop trigger atomic_fail_feature_summary on product_content_sync_intents`;
      await sql`drop function atomic_fail_feature_summary()`;
    }
  });

  async function withResearchMigrationBaseline(
    baselineTag: string,
    run: (session: Sql, database: PostgresJsDatabase, migrationsSchema: string) => Promise<void>
  ) {
    const schema = `request_migration_${randomUUID().split('-').join('')}`;
    const folder = await mkdtemp(join(tmpdir(), 'darun-request-migration-'));
    const session = postgres(databaseUrl!, {
      max: 4,
      prepare: false,
      connection: { search_path: schema, statement_timeout: 10000, lock_timeout: 5000 },
    });
    try {
      await sql`create schema ${sql(schema)}`;
      await cp(migrationsFolder, folder, { recursive: true });
      const journal = JSON.parse(await readFile(join(folder, 'meta/_journal.json'), 'utf8')) as {
        entries: Array<{ tag: string }>;
      };
      const baselineIndex = journal.entries.findIndex(entry => entry.tag === baselineTag);
      if (baselineIndex < 0) throw new Error(`Missing migration baseline: ${baselineTag}`);
      journal.entries = journal.entries.slice(0, baselineIndex + 1);
      await writeFile(join(folder, 'meta/_journal.json'), JSON.stringify(journal));
      const database = drizzle(session);
      await migrate(database, { migrationsFolder: folder, migrationsSchema: schema });
      await run(session, database, schema);
    } finally {
      await session.end({ timeout: 5 });
      await sql`drop schema if exists ${sql(schema)} cascade`;
      await rm(folder, { recursive: true, force: true });
    }
  }

  async function withResearchGraphqlServer(
    database: PostgresJsDatabase,
    run: (server: ApolloServer) => Promise<void>,
    productRepository = new PostgresqlProductRepository(database as never)
  ) {
    // 정적 import는 첫 fixture의 container를 singleton에 고정하므로 이 테스트에서만 module을 다시 로드한다.
    // production factory의 캐시는 유지하고 barrel 재로딩 없이 기존 resolver와 TypeDI token을 사용한다.
    vi.resetModules();
    const { createServer } = await import('../../../../shared/utils-apollo-server/src/libs/createServer/createServer');
    const scope = `request_graphql_${randomUUID()}`;
    const container = Container.of(scope);
    let server: ApolloServer | undefined;
    try {
      container.set(DrizzleToken, database);
      container.set(ProductResearchJobRepositoryToken, new PostgresqlProductResearchJobRepository(database as never));
      container.set(ProductResearchQueueService, {
        sendJob: async () => false,
      });
      container.set(LlmClient, {});
      container.set(LlmSettingService, { getBraveApiKey: async () => null });
      container.set(
        ProductPublishMutationResolver,
        new ProductPublishMutationResolver(
          {} as never,
          new CreateProduct(productRepository),
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never
        )
      );
      server = createServer({
        options: {
          resolvers: [ProductPublishMutationResolver, ProductResearchMutationResolver, ProductResearchQueryResolver],
          container,
          authChecker: () => true,
        },
        config: { playground: false },
      });
      await run(server);
    } finally {
      try {
        await server?.stop();
      } finally {
        Container.remove(scope);
      }
    }
  }

  it('serializes concurrent requests sharing the same singleton store and returns historical application', async () => {
    const product = await seed();
    const job = await candidate(product.id);
    const usecase = apply();
    const results = await Promise.all([usecase.execute({ jobId: job.id }), usecase.execute({ jobId: job.id })]);
    expect(results.map(result => result.alreadyApplied).sort()).toEqual([false, true]);
    await db.update(products).set({ description: '<p>later human edit</p>' }).where(eq(products.id, product.id));
    await db
      .update(productDescriptionJobs)
      .set({ status: 'failed', candidateHtml: null })
      .where(eq(productDescriptionJobs.id, job.id));
    expect(await usecase.execute({ jobId: job.id })).toMatchObject({
      alreadyApplied: true,
      product: { description: '<p>later human edit</p>' },
    });
  });

  it.each(['v2', null] as const)('applies stored renderer bytes with hash version %s', async version => {
    const product = await seed();
    const job = await candidate(product.id, version);
    expect((await apply().execute({ jobId: job.id })).product.description).toBe(
      '<blockquote>stored &amp; bytes</blockquote>'
    );
  });

  it.each(['feature', 'link', 'screenshot', 'flow'] as const)(
    'rejects stale Apply after a separate-connection %s phantom commits',
    async kind => {
      const product = await seed();
      const job = await candidate(product.id);
      let write!: Promise<unknown>;
      await db.transaction(async tx => {
        await lockProductSource(tx as never, product.id);
        if (kind === 'feature')
          write = new PostgresqlProductFeatureRepository(writerDb as never).insert(
            new ProductFeature({ productId: product.id, name: '새 기능', summary: '새 설명', emoji: '🔎' })
          );
        if (kind === 'link')
          write = new PostgresqlProductLinkRepository(writerDb as never).insert(
            new ProductLink({
              productId: product.id,
              title: '새 링크',
              iconUrl: 'https://example.com/icon.png',
              link: 'https://example.com/new',
              displayLink: '새 문구',
            })
          );
        if (kind === 'screenshot')
          write = new PostgresqlProductScreenshotRepository(writerDb as never).insert(
            new ProductScreenshot({
              productId: product.id,
              imageUrl: 'https://example.com/screen.png',
              imageAlt: '새 화면',
              title: '새 제목',
            })
          );
        if (kind === 'flow') {
          const [screen] = await tx
            .insert(productScreenshots)
            .values({ productId: product.id, imageUrl: 'https://example.com/flow.png', imageAlt: '플로 화면' })
            .returning();
          write = new PostgresqlProductFlowRepository(writerDb as never).insert(
            new ProductFlow({
              productId: product.id,
              title: '가입 흐름',
              description: '새 흐름',
              platform: 'WEB',
              flowType: 'ONBOARDING',
              steps: [{ screenshotId: screen!.id, caption: '새 단계' }],
            }),
            () => {}
          );
        }
        await waitForWriterLock();
        expect(
          (await tx.select().from(productDescriptionJobs).where(eq(productDescriptionJobs.id, job.id)))[0]?.appliedAt
        ).toBeNull();
      });
      await write;
      await expect(apply().execute({ jobId: job.id })).rejects.toMatchObject({ code: 'STALE_CANDIDATE' });
      expect((await db.select().from(products).where(eq(products.id, product.id)))[0]?.description).toBe('<p>base</p>');
    }
  );

  it('exposes STALE_CANDIDATE and historical alreadyApplied through the actual Apply schema mutation', async () => {
    const product = await seed();
    const job = await candidate(product.id);
    const resolver = new ProductPublishMutationResolver(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      apply()
    );
    Container.set(ProductPublishMutationResolver, resolver);
    const schema = buildSchemaSync({
      resolvers: [ProductPublishMutationResolver, ProductResearchQueryResolver],
      container: Container,
      authChecker: () => true,
    });
    await db.update(products).set({ description: '<p>human edit</p>' }).where(eq(products.id, product.id));
    const source =
      'mutation($jobId: String!) { applyProductDescriptionCandidate(jobId: $jobId) { alreadyApplied product { description } } }';
    const stale = await graphql({ schema, source, variableValues: { jobId: job.id } });
    expect(stale.errors?.[0]?.extensions.code).toBe('STALE_CANDIDATE');
    await db
      .update(productDescriptionJobs)
      .set({ appliedAt: new Date(), status: 'failed', candidateHtml: null })
      .where(eq(productDescriptionJobs.id, job.id));
    const historical = await graphql({ schema, source, variableValues: { jobId: job.id } });
    expect(historical.errors).toBeUndefined();
    expect(historical.data?.applyProductDescriptionCandidate).toMatchObject({
      alreadyApplied: true,
      product: { description: '<p>human edit</p>' },
    });
  });

  it('holds Category shared reads until the source snapshot transaction commits', async () => {
    const product = await seed();
    const [category] = await db
      .insert(categories)
      .values({ slug: `${prefix}-${sequence++}`, labelKo: '이전 분류', labelEn: 'Old Category' })
      .returning();
    await db
      .update(products)
      .set({ categoryIds: [category!.id] })
      .where(eq(products.id, product.id));
    const job = await candidate(product.id);
    let write!: Promise<unknown>;
    await db.transaction(async tx => {
      const sources = await readProductDescriptionEvidenceSources(tx as never, product.id);
      write = new PostgresqlCategoryRepository(writerDb as never).updateById(category!.id, value => {
        value.labelKo = '새 분류';
        return value;
      });
      await waitForWriterLock();
      expect(sources.categories[0]?.labelKo).toBe('이전 분류');
    });
    await write;
    await expect(apply().execute({ jobId: job.id })).rejects.toMatchObject({ code: 'STALE_CANDIDATE' });
  });

  it.each(['link', 'unlink'] as const)(
    '미commit %s 이후 Category 수정은 확정된 owner 전체의 revision과 검색 intent를 기록한다',
    async change => {
      const category = await categoryFixture();
      const changing = await publishedOwner(change === 'link' ? [] : [category.id]);
      const remaining = await publishedOwner([category.id]);
      const ids = [changing.id, remaining.id];
      const before = await syncState(ids);
      let edit!: Promise<unknown>;
      try {
        await db.transaction(async tx => {
          await new PostgresqlProductRepository(tx as never).updateById(changing.id, value => {
            value.update({ categoryIds: change === 'link' ? [category.id] : [] });
            return value;
          });
          const [holder] = await tx.execute(querySql`select pg_backend_pid() as pid`);
          edit = new PostgresqlCategoryRepository(writerDb as never).updateById(category.id, value => {
            value.labelKo = '확정된 새 분류';
            return value;
          });
          // The link/unlink and its intent exist only in this uncommitted transaction.
          await waitForMembershipGate(Number(holder!.pid));
          expect((await db.select().from(categories).where(eq(categories.id, category.id)))[0]?.labelKo).toBe(
            '이전 분류'
          );
          expect((await syncState(ids)).products).toEqual(before.products);
        });
        await edit;
      } finally {
        if (edit) await Promise.allSettled([edit]);
      }
      const after = await syncState(ids);
      expect(after.translation).toEqual(before.translation);
      expect(after.products.find(row => row.id === changing.id)?.categoryIds).toEqual(
        change === 'link' ? [category.id] : []
      );
      expect(after.products.find(row => row.id === remaining.id)?.categoryIds).toEqual([category.id]);
      expect((await db.select().from(categories).where(eq(categories.id, category.id)))[0]?.labelKo).toBe(
        '확정된 새 분류'
      );
      await expectSearchRevisions(
        changing.id,
        change === 'link' ? [BigInt('1'), BigInt('2'), BigInt('3')] : [BigInt('1'), BigInt('2')]
      );
      await expectSearchRevisions(remaining.id, [BigInt('1'), BigInt('2')]);
      const fresh = await db.transaction(tx => readProductDescriptionEvidenceSources(tx as never, remaining.id));
      expect(fresh.categories.map(row => row?.labelKo)).toEqual(['확정된 새 분류']);
    }
  );

  it('Category 수정이 먼저 commit하면 후속 연결이 최신 분류를 자기 revision에 포함한다', async () => {
    const category = await categoryFixture();
    const product = await publishedOwner([]);
    const before = await syncState([product.id]);
    let link!: Promise<unknown>;
    try {
      await db.transaction(async tx => {
        await new PostgresqlCategoryRepository(tx as never).updateById(category.id, value => {
          value.labelKo = '연결 전 새 분류';
          return value;
        });
        const [holder] = await tx.execute(querySql`select pg_backend_pid() as pid`);
        link = new PostgresqlProductRepository(writerDb as never).updateById(product.id, value => {
          value.update({ categoryIds: [category.id] });
          return value;
        });
        await waitForMembershipGate(Number(holder!.pid));
        expect((await syncState([product.id])).products).toEqual(before.products);
      });
      await link;
    } finally {
      if (link) await Promise.allSettled([link]);
    }
    const after = await syncState([product.id]);
    expect(after.translation).toEqual(before.translation);
    expect(after.products[0]?.categoryIds).toEqual([category.id]);
    await expectSearchRevisions(product.id, [BigInt('1'), BigInt('2')]);
    const fresh = await db.transaction(tx => readProductDescriptionEvidenceSources(tx as never, product.id));
    expect(fresh.categories.map(row => row?.labelKo)).toEqual(['연결 전 새 분류']);
  });

  it('여러 Category가 반대 순서로 연결된 Product들을 갱신해도 누락이나 lost update가 없다', async () => {
    const firstCategory = await categoryFixture();
    const secondCategory = await categoryFixture();
    const first = await publishedOwner([firstCategory.id, secondCategory.id]);
    const second = await publishedOwner([secondCategory.id, firstCategory.id]);
    const ids = [first.id, second.id];
    const before = await syncState(ids);
    let secondEdit!: Promise<unknown>;
    try {
      await db.transaction(async tx => {
        await new PostgresqlCategoryRepository(tx as never).updateById(firstCategory.id, value => {
          value.labelKo = '첫 분류 변경';
          return value;
        });
        const [holder] = await tx.execute(querySql`select pg_backend_pid() as pid`);
        secondEdit = new PostgresqlCategoryRepository(writerDb as never).updateById(secondCategory.id, value => {
          value.labelEn = 'Second changed category';
          return value;
        });
        await waitForMembershipGate(Number(holder!.pid));
      });
      await secondEdit;
    } finally {
      if (secondEdit) await Promise.allSettled([secondEdit]);
    }
    const after = await syncState(ids);
    expect(after.translation).toEqual(before.translation);
    expect(after.products.map(row => row.categoryIds)).toEqual(before.products.map(row => row.categoryIds));
    for (const product of [first, second]) {
      await expectSearchRevisions(product.id, [BigInt('1'), BigInt('2'), BigInt('3')]);
      const fresh = await db.transaction(tx => readProductDescriptionEvidenceSources(tx as never, product.id));
      expect(fresh.categories.find(row => row?.id === firstCategory.id)?.labelKo).toBe('첫 분류 변경');
      expect(fresh.categories.find(row => row?.id === secondCategory.id)?.labelEn).toBe('Second changed category');
    }
  });

  it('Category timestamp-only no-op은 owner revision·검색·번역·영어 provenance를 그대로 둔다', async () => {
    const category = await categoryFixture();
    const product = await publishedOwner([category.id]);
    const before = await syncState([product.id]);
    const unchanged = await new PostgresqlCategoryRepository(db as never).updateById(category.id, value => value);
    expect(unchanged.labelKo).toBe(category.labelKo);
    expect(unchanged.labelEn).toBe(category.labelEn);
    expect(await syncState([product.id])).toEqual(before);
  });

  it('마지막 owner의 실제 intent INSERT 실패는 Category와 앞선 owner의 revision·intent도 rollback한다', async () => {
    const category = await categoryFixture();
    const first = await publishedOwner([category.id]);
    const second = await publishedOwner([category.id]);
    const ids = [first.id, second.id].sort();
    const before = await syncState(ids);
    await sql`create function atomic_fail_category_intent() returns trigger language plpgsql as $$
      begin
        if new.kind = 'search' and new.product_id = current_setting('darun.category_failure_product', true) then
          raise exception 'injected last Category owner intent failure';
        end if;
        return new;
      end $$`;
    await sql`create trigger atomic_fail_category_intent before insert on product_content_sync_intents
      for each row execute function atomic_fail_category_intent()`;
    try {
      await expect(
        db.transaction(async tx => {
          await tx.execute(
            querySql`select set_config('darun.category_failure_product', ${ids[ids.length - 1]!}, true)`
          );
          await new PostgresqlCategoryRepository(tx as never).updateById(category.id, value => {
            value.labelKo = 'rollback 분류';
            return value;
          });
        })
      ).rejects.toMatchObject({ cause: { message: 'injected last Category owner intent failure' } });
      expect((await db.select().from(categories).where(eq(categories.id, category.id)))[0]).toEqual(category);
      expect(await syncState(ids)).toEqual(before);
    } finally {
      await sql`drop trigger atomic_fail_category_intent on product_content_sync_intents`;
      await sql`drop function atomic_fail_category_intent()`;
    }
  });

  it.each(['Product insert', 'Research materialize'] as const)(
    '%s는 새 관계 삽입·Category 공유 read 전에 membership gate를 기다린다',
    async kind => {
      const category = await categoryFixture();
      const job = kind === 'Research materialize' ? await research() : undefined;
      const slug = `${prefix}-${sequence++}`;
      let insertion!: Promise<unknown>;
      try {
        await db.transaction(async tx => {
          await new PostgresqlCategoryRepository(tx as never).updateById(category.id, value => {
            value.labelKo = '삽입 전 새 분류';
            return value;
          });
          const [holder] = await tx.execute(querySql`select pg_backend_pid() as pid`);
          insertion = job
            ? new PostgresqlProductResearchMaterializationRepository(writerDb as never).materialize({
                ...review(job.id),
                slug,
                categoryIds: [category.id],
              })
            : new PostgresqlProductRepository(writerDb as never).insert(
                new Product({
                  name: '새 관계',
                  slug,
                  summary: '검토 요약',
                  logoUrl: 'https://example.com/logo.png',
                  categoryIds: [category.id],
                })
              );
          await waitForMembershipGate(Number(holder!.pid));
          expect(await db.select().from(products).where(eq(products.slug, slug))).toHaveLength(0);
        });
        await insertion;
      } finally {
        if (insertion) await Promise.allSettled([insertion]);
      }
      const [inserted] = await db.select().from(products).where(eq(products.slug, slug));
      expect(inserted?.categoryIds).toEqual([category.id]);
      expect(inserted?.publishedAt).toBeNull();
      const fresh = await db.transaction(tx => readProductDescriptionEvidenceSources(tx as never, inserted!.id));
      expect(fresh.categories.map(row => row?.labelKo)).toEqual(['삽입 전 새 분류']);
      expect((await syncState([inserted!.id])).search).toEqual([]);
      expect((await syncState([inserted!.id])).translation.jobs).toEqual([]);
      if (job) {
        const [storedJob] = await db.select().from(productResearchJobs).where(eq(productResearchJobs.id, job.id));
        expect(storedJob?.materializedProductId).toBe(inserted!.id);
        expect(storedJob?.reviewedInput?.categoryIds).toEqual([category.id]);
      }
    }
  );

  it('keeps a later source writer outside Apply snapshot/hash/content/marker commit', async () => {
    const product = await seed();
    const job = await candidate(product.id);
    const realStore = new PostgresqlProductDescriptionApplyStore(db as never);
    let write!: Promise<unknown>;
    const usecase = new ApplyProductDescriptionCandidate({
      transaction: {
        run: work =>
          realStore.transaction.run(session =>
            work({
              ...session,
              assembleLocked: async productId => {
                const snapshot = await session.assembleLocked(productId);
                write = new PostgresqlProductFeatureRepository(writerDb as never).insert(
                  new ProductFeature({ productId, name: '나중 기능', summary: 'commit 이후 원문', emoji: '🔎' })
                );
                await waitForWriterLock();
                return snapshot;
              },
            })
          ),
      },
    });
    expect((await usecase.execute({ jobId: job.id })).alreadyApplied).toBe(false);
    await write;
    const after = await new PostgresqlProductDescriptionEvidenceAssembler(db as never).assemble(product.id);
    expect(after.evidenceHash).not.toBe(job.evidenceHash);
    expect((await db.select().from(products).where(eq(products.id, product.id)))[0]?.description).toBe(
      job.candidateHtml
    );
  });

  it('preserves committed human edits and rejects stale base hashes', async () => {
    const product = await seed();
    const job = await candidate(product.id);
    await new PostgresqlProductRepository(writerDb as never).updateById(product.id, value => {
      value.update({ description: '<p>human edit</p>' });
      return value;
    });
    await expect(apply().execute({ jobId: job.id })).rejects.toMatchObject({ code: 'STALE_CANDIDATE' });
    expect((await db.select().from(products).where(eq(products.id, product.id)))[0]?.description).toBe(
      '<p>human edit</p>'
    );
  });

  it('does not expose rolled-back Feature phantoms to the fresh snapshot', async () => {
    const product = await seed();
    const before = await new PostgresqlProductDescriptionEvidenceAssembler(db as never).assemble(product.id);
    await expect(
      writerDb.transaction(async tx => {
        await lockProductSource(tx as never, product.id);
        await tx
          .insert(productFeatures)
          .values({ productId: product.id, name: 'rollback feature', emoji: '🔎', summary: 'must disappear' });
        throw new Error('rollback source write');
      })
    ).rejects.toThrow('rollback source write');
    const after = await new PostgresqlProductDescriptionEvidenceAssembler(db as never).assemble(product.id);
    expect(after.evidenceHash).toBe(before.evidenceHash);
    expect(after.evidence.items).toEqual(before.evidence.items);
  });

  it('rolls back candidate HTML when the persisted marker write fails', async () => {
    const product = await seed();
    const job = await candidate(product.id);
    await sql`create function atomic_fail_marker() returns trigger language plpgsql as $$ begin raise exception 'injected marker failure'; end $$`;
    await sql`create trigger atomic_fail_marker before update of applied_at on product_description_jobs for each row execute function atomic_fail_marker()`;
    try {
      await expect(apply().execute({ jobId: job.id })).rejects.toThrow();
      expect((await db.select().from(products).where(eq(products.id, product.id)))[0]?.description).toBe('<p>base</p>');
      expect(
        (await db.select().from(productDescriptionJobs).where(eq(productDescriptionJobs.id, job.id)))[0]?.appliedAt
      ).toBeNull();
    } finally {
      await sql`drop trigger atomic_fail_marker on product_description_jobs`;
      await sql`drop function atomic_fail_marker()`;
    }
  });

  async function research() {
    const [job] = await db
      .insert(productResearchJobs)
      .values({
        requestKey: `${prefix}-${sequence++}`,
        officialUrl: 'https://example.com/',
        status: 'completed',
        resultJson: JSON.stringify({ version: 1, originalUrl: 'https://example.com/', sources: [] }),
      })
      .returning();
    return job!;
  }
  function review(jobId: string, slug = `${prefix}-${sequence++}`) {
    return {
      researchJobId: jobId,
      name: '검토한 제품',
      slug,
      summary: '사람이 수정한 요약',
      logoUrl: 'https://example.com/logo.png',
      officialUrl: 'https://example.com/',
      officialUrlConfirmed: false,
      categoryIds: [],
      features: [{ name: '검토한 기능', summary: '기능 설명', emoji: '🔎' }],
      tags: [`tag-${prefix}`],
    };
  }

  it.each(['수동 생성', '조사 등록'] as const)(
    '%s의 실제 동시 slug 충돌은 안전한 GraphQL code와 재시도를 제공한다',
    async kind => {
      const slug = `${prefix}-${sequence++}`;
      const jobs = kind === '조사 등록' ? await Promise.all([research(), research()]) : [];
      const repository = new PostgresqlProductRepository(db as never);
      // 두 실제 사전 조회를 모두 끝낸 뒤 insert를 허용하여 check-then-insert 경합을 강제한다.
      const find = repository.findOneBySlug.bind(repository);
      let release!: () => void;
      const ready = new Promise<void>(resolve => {
        release = resolve;
      });
      let reads = 0;
      const precheck = vi.spyOn(repository, 'findOneBySlug').mockImplementation(async value => {
        const result = await find(value);
        if (value === slug) {
          reads += 1;
          if (reads === 2) release();
          await ready;
        }
        return result;
      });
      const beforeJobs = jobs.map(job => ({ ...job }));
      const beforeCounts =
        await sql`select 'features' as source, count(*) from product_features union all select 'links', count(*) from product_links union all select 'product_tags', count(*) from product_tags order by source`;
      try {
        await withResearchGraphqlServer(
          db,
          async server => {
            const create = async (index: number, nextSlug = slug) => {
              const response = await server.executeOperation(
                kind === '수동 생성'
                  ? {
                      query:
                        'mutation($input: CreateProductInput!) { createProduct(input: $input) { product { id slug } } }',
                      variables: {
                        input: {
                          name: '수동 제품',
                          slug: nextSlug,
                          summary: '요약',
                          logoUrl: 'https://example.com/logo.png',
                        },
                      },
                    }
                  : {
                      query:
                        'mutation($input: MaterializeResearchedProductInput!) { materializeResearchedProduct(input: $input) { id slug } }',
                      variables: { input: review(jobs[index]!.id, nextSlug) },
                    }
              );
              if (response.body.kind !== 'single') throw new Error('Expected single GraphQL response');
              return response.body.singleResult;
            };
            const results = await Promise.all([create(0), create(1)]);
            const loser = results.findIndex(result => result.errors);
            expect(results.filter(result => !result.errors)).toHaveLength(1);
            expect(loser).toBeGreaterThanOrEqual(0);
            expect(results[loser]!.errors).toMatchObject([{ extensions: { code: 'product/slug-already-exists' } }]);
            expect(JSON.stringify(results[loser])).not.toMatch(
              /insert into|Failed query|23505|constraint_name|params/i
            );
            const stored = await db.select().from(products).where(eq(products.slug, slug));
            expect(stored).toHaveLength(1);
            if (kind === '수동 생성') expect(reads).toBe(2);
            else {
              expect(
                (await db.select().from(productResearchJobs).where(eq(productResearchJobs.id, jobs[loser]!.id)))[0]
              ).toEqual(beforeJobs[loser]);
              const afterCounts =
                await sql`select 'features' as source, count(*) from product_features union all select 'links', count(*) from product_links union all select 'product_tags', count(*) from product_tags order by source`;
              expect(afterCounts.map((row, i) => Number(row.count) - Number(beforeCounts[i]!.count))).toEqual([
                1, 1, 1,
              ]);
              expect(
                await db.select().from(productFeatures).where(eq(productFeatures.productId, stored[0]!.id))
              ).toHaveLength(1);
              expect(
                await db.select().from(productLinks).where(eq(productLinks.productId, stored[0]!.id))
              ).toHaveLength(1);
              expect(await db.select().from(productTags).where(eq(productTags.productId, stored[0]!.id))).toHaveLength(
                1
              );
            }
            const retrySlug = `${slug}-retry`;
            expect((await create(loser, retrySlug)).errors).toBeUndefined();
            expect(await db.select().from(products).where(eq(products.slug, retrySlug))).toHaveLength(1);
          },
          repository
        );
      } finally {
        precheck.mockRestore();
      }
    }
  );

  it('creates only one unpublished Product for concurrent different slugs and preserves winner reviewed_input', async () => {
    const job = await research();
    const a = review(job.id);
    const b = review(job.id);
    const [first, second] = await Promise.all([
      new PostgresqlProductResearchMaterializationRepository(db as never).materialize(a),
      new PostgresqlProductResearchMaterializationRepository(writerDb as never).materialize(b),
    ]);
    expect(first.product.id).toBe(second.product.id);
    expect([first.alreadyCreated, second.alreadyCreated].sort()).toEqual([false, true]);
    const [stored] = await db.select().from(productResearchJobs).where(eq(productResearchJobs.id, job.id));
    const winner = first.alreadyCreated ? b : a;
    const { researchJobId: _jobId, officialUrlConfirmed: _confirmed, ...reviewedInput } = winner;
    expect(stored?.reviewedInput).toEqual(reviewedInput);
    expect(stored?.appliedAt).toBeInstanceOf(Date);
    expect(first.product.publishedAt).toBeUndefined();
    expect(first.product.description).toBeUndefined();
    expect(
      await db
        .select()
        .from(products)
        .where(eq(products.slug, first.alreadyCreated ? a.slug : b.slug))
    ).toHaveLength(0);
    expect(await db.select().from(productFeatures).where(eq(productFeatures.productId, first.product.id))).toHaveLength(
      1
    );
    expect(await db.select().from(productLinks).where(eq(productLinks.productId, first.product.id))).toHaveLength(1);
    expect(await db.select().from(productTags).where(eq(productTags.productId, first.product.id))).toHaveLength(1);
  });

  it.each(['https://example.com/different-path', 'https://other.example.org/'])(
    'requires explicit editor confirmation for changed URL %s',
    async officialUrl => {
      const job = await research();
      const input = { ...review(job.id), officialUrl };
      const repo = new PostgresqlProductResearchMaterializationRepository(db as never);
      await expect(repo.materialize(input)).rejects.toMatchObject({ code: 'product/invalid-args' });
      expect(await db.select().from(products).where(eq(products.slug, input.slug))).toHaveLength(0);
      expect((await repo.materialize({ ...input, officialUrlConfirmed: true })).alreadyCreated).toBe(false);
    }
  );

  it('rolls back Product, relationships, reviewed_input and marker together', async () => {
    const job = await research();
    const input = { ...review(job.id), tags: [`rollback-tag-${prefix}`] };
    const before =
      await sql`select 'features' as source, count(*) from product_features union all select 'links', count(*) from product_links union all select 'product_tags', count(*) from product_tags union all select 'tags', count(*) from tags order by source`;
    await sql`create function atomic_fail_research() returns trigger language plpgsql as $$ begin raise exception 'injected review marker failure'; end $$`;
    await sql`create trigger atomic_fail_research before update of applied_at on product_research_jobs for each row execute function atomic_fail_research()`;
    try {
      await expect(
        new PostgresqlProductResearchMaterializationRepository(db as never).materialize(input)
      ).rejects.toThrow();
      expect(await db.select().from(products).where(eq(products.slug, input.slug))).toHaveLength(0);
      const [stored] = await db.select().from(productResearchJobs).where(eq(productResearchJobs.id, job.id));
      expect(stored).toMatchObject({ reviewedInput: null, materializedProductId: null, appliedAt: null });
      const after =
        await sql`select 'features' as source, count(*) from product_features union all select 'links', count(*) from product_links union all select 'product_tags', count(*) from product_tags union all select 'tags', count(*) from tags order by source`;
      expect(after).toEqual(before);
    } finally {
      await sql`drop trigger atomic_fail_research on product_research_jobs`;
      await sql`drop function atomic_fail_research()`;
    }
  });

  it.each(['upstream 0011', 'previous journal'])(
    '%s에서 실제 migration 후 재전송과 새 action/retry를 구분하고 저장 이력을 보존한다',
    async baseline => {
      const journal = JSON.parse(await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8')) as {
        entries: Array<{ tag: string }>;
      };
      const cutoverIndex = journal.entries.findIndex(entry => entry.tag.endsWith('_research_request_namespace'));
      if (cutoverIndex < 1) throw new Error('Missing request identity migration or its predecessor');
      const baselineTag = baseline === 'upstream 0011' ? '0011_bizarre_xavin' : journal.entries[cutoverIndex - 1]!.tag;
      const product = await seed();
      const productBefore = (await db.select().from(products).where(eq(products.id, product.id)))[0];
      await withResearchMigrationBaseline(baselineTag, async (session, database, migrationsSchema) => {
        const compactIds = [randomUUID(), randomUUID(), randomUUID()].map(id => id.split('-').join(''));
        const supportedKeys = [...compactIds, randomUUID(), randomUUID().toUpperCase()];
        const untouchedKeys = [
          `request:${randomUUID().split('-').join('')}`,
          `url:${'c'.repeat(64)}`,
          'e7f8a1b2c3d4312a9b0c1d2e3f4a5b6c', // v3
          'e7f8a1b2c3d4412a7b0c1d2e3f4a5b6c', // invalid variant
          'e7f8a1b2-c3d4-412a-9b0c1d2e3f4a5b6c', // malformed hyphens
          ` ${randomUUID()} `,
          'manual-import-key',
        ];
        const statuses = ['pending', 'failed', 'completed', 'pending', 'completed'];
        for (const [index, requestKey] of [...supportedKeys, ...untouchedKeys].entries()) {
          await session`insert into product_research_jobs ${session({
            id: `${prefix}-legacy-${index}`,
            request_key: requestKey,
            official_url: 'https://example.com/tool',
            status: statuses[index] ?? 'completed',
            stage: index === 1 ? 'failed' : 'stored-stage',
            error_code: index === 1 ? 'INVALID_GENERATION' : null,
            error_message: index === 1 ? 'stored historical failure' : null,
            result_json: JSON.stringify({
              version: 1,
              originalUrl: 'https://example.com/tool',
              identity: {
                name: { value: '사람이 검토한 이름', anchors: [], evidenceType: 'NONE' },
                suggestedSlug: 'reviewed-tool',
              },
              features: [],
              tags: ['stored-tag'],
              sources: [],
              warnings: ['SPARSE_FACTS'],
              categoryCandidates: [],
              sourceSnapshotHash: `stored-source-hash-${index}`,
              promptVersion: `stored-prompt-${index}`,
              model: `stored-model-${index}`,
            }),
            source_snapshot_hash: `stored-source-hash-${index}`,
            model: `stored-model-${index}`,
            prompt_version: `stored-prompt-${index}`,
            lease_token: `stored-lease-${index}`,
            lease_until: '2026-10-16 01:02:03.456',
            attempt_count: index % 4,
            materialized_product_id: index === 2 ? product.id : null,
            applied_at: index === 2 ? '2026-10-13 04:05:06.789' : null,
            created_at: '2026-10-10 01:02:03.456',
            updated_at: '2026-10-12 04:05:06.789',
          })}`;
        }
        if (baseline === 'previous journal') {
          const {
            researchJobId: _jobId,
            officialUrlConfirmed: _confirmed,
            ...reviewedInput
          } = review(`${prefix}-legacy-2`);
          reviewedInput.name = '사람이 고친 이름';
          reviewedInput.summary = '사람 편집 보존';
          await session`update product_research_jobs set
            reviewed_input = ${JSON.stringify(reviewedInput)}::jsonb,
            run_not_before = '2026-10-17 02:03:04.567',
            next_dispatch_at = '2026-10-18 03:04:05.678',
            retry_of_job_id = ${`${prefix}-legacy-1`}
            where id = ${`${prefix}-legacy-2`}`;
        }
        const before = await session`select * from product_research_jobs order by id`;
        await migrate(database, { migrationsFolder, migrationsSchema });
        const after = await session`select * from product_research_jobs order by id`;
        expect(after).toHaveLength(before.length);
        for (const row of before) {
          const expected = {
            ...row,
            request_key: supportedKeys.includes(row.request_key) ? `request:${row.request_key}` : row.request_key,
          };
          const migrated = after.find(candidate => candidate.id === row.id);
          if (baseline === 'previous journal') expect(migrated).toEqual(expected);
          else expect(migrated).toMatchObject(expected);
        }
        const history = await session`select * from __drizzle_migrations order by id`;
        expect(history).toHaveLength(journal.entries.length);
        await migrate(database, { migrationsFolder, migrationsSchema });
        expect(await session`select * from product_research_jobs order by id`).toEqual(after);
        expect(await session`select * from __drizzle_migrations order by id`).toEqual(history);

        const repository = new PostgresqlProductResearchJobRepository(database as never);
        expect(await repository.findByRequestKey(compactIds[0]!)).toBeNull();
        expect(await repository.findByRequestKey(`request:${compactIds[0]}`)).toMatchObject({
          id: `${prefix}-legacy-0`,
        });
        await expect(
          repository.createPendingJob({
            requestKey: `request:${compactIds[0]}`,
            officialUrl: 'https://example.com/tool',
          })
        ).rejects.toMatchObject({ cause: { code: '23505' } });

        await withResearchGraphqlServer(database, async server => {
          const request = async (requestId: string, officialUrl = 'https://EXAMPLE.com:443/tool') => {
            const response = await server.executeOperation({
              query:
                'mutation($input: RequestProductResearchInput!) { requestProductResearch(input: $input) { id officialUrl status } }',
              variables: { input: { requestId, officialUrl } },
            });
            if (response.body.kind !== 'single') throw new Error('Expected single GraphQL response');
            return response.body.singleResult;
          };
          const replayIds = [...supportedKeys, untouchedKeys[0]!.slice('request:'.length)];
          for (const [index, requestId] of replayIds.entries()) {
            const [first, duplicate, conflict] = await Promise.all([
              request(requestId),
              request(requestId),
              request(requestId, 'https://example.com/other-tool'),
            ]);
            expect(first.errors).toBeUndefined();
            expect(duplicate.errors).toBeUndefined();
            expect(first.data?.requestProductResearch).toMatchObject({ id: `${prefix}-legacy-${index}` });
            expect(duplicate.data).toEqual(first.data);
            expect(conflict.errors?.[0]?.extensions?.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
          }
          const actionId = randomUUID();
          const [action, duplicateAction] = await Promise.all([request(actionId), request(actionId)]);
          expect(action.errors).toBeUndefined();
          expect(duplicateAction.errors).toBeUndefined();
          expect(duplicateAction.data).toEqual(action.data);
          const [actionRow] =
            await session`select * from product_research_jobs where request_key = ${`request:${actionId}`}`;
          expect(actionRow?.id).not.toBe(`${prefix}-legacy-0`);
          expect(actionRow?.status).toBe('pending');
          expect(action.data?.requestProductResearch).toMatchObject({ id: actionRow?.id, status: 'pending' });

          const retryId = randomUUID();
          const retry = async () => {
            const response = await server.executeOperation({
              query:
                'mutation($jobId: String!, $input: RetryProductResearchInput!) { retryProductResearch(jobId: $jobId, input: $input) { id status } }',
              variables: { jobId: `${prefix}-legacy-1`, input: { requestId: retryId } },
            });
            if (response.body.kind !== 'single') throw new Error('Expected single GraphQL response');
            return response.body.singleResult;
          };
          const [retried, duplicateRetry] = await Promise.all([retry(), retry()]);
          expect(retried.errors).toBeUndefined();
          expect(duplicateRetry.errors).toBeUndefined();
          expect(duplicateRetry.data).toEqual(retried.data);
          const [retryRow] =
            await session`select * from product_research_jobs where request_key = ${`request:${retryId}`}`;
          expect(retryRow).toMatchObject({ status: 'pending', retry_of_job_id: `${prefix}-legacy-1` });
          expect(retryRow?.id).not.toBe(`${prefix}-legacy-1`);
          expect(retried.data?.retryProductResearch).toMatchObject({ id: retryRow?.id, status: 'pending' });
          expect(
            await session`select * from product_research_jobs where id like ${`${prefix}-legacy-%`} order by id`
          ).toEqual(after);
          expect(
            await session`select id from product_research_jobs where request_key = ${`request:${actionId}`}`
          ).toHaveLength(1);
          expect(
            await session`select id from product_research_jobs where request_key = ${`request:${retryId}`}`
          ).toHaveLength(1);
          expect(await session`select id from product_research_jobs`).toHaveLength(before.length + 2);
          expect((await db.select().from(products).where(eq(products.id, product.id)))[0]).toEqual(productBefore);
        });
      });
    },
    30_000
  );

  it.each([
    { baseline: 'previous journal', targetUrl: 'https://example.com/tool' },
    { baseline: 'upstream 0011', targetUrl: 'https://example.com/different-tool' },
  ])(
    '$baseline의 bare/request 충돌 URL $targetUrl에서 migration과 journal 전체를 rollback한다',
    async ({ baseline, targetUrl }) => {
      const journal = JSON.parse(await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8')) as {
        entries: Array<{ tag: string }>;
      };
      const cutoverIndex = journal.entries.findIndex(entry => entry.tag.endsWith('_research_request_namespace'));
      if (cutoverIndex < 1) throw new Error('Missing request identity migration or its predecessor');
      const baselineTag = baseline === 'upstream 0011' ? '0011_bizarre_xavin' : journal.entries[cutoverIndex - 1]!.tag;
      await withResearchMigrationBaseline(baselineTag, async (session, database, migrationsSchema) => {
        const requestId = randomUUID().split('-').join('');
        const otherId = randomUUID();
        await session`insert into product_research_jobs ${session([
          {
            id: `${prefix}-collision-bare`,
            request_key: requestId,
            official_url: 'https://example.com/tool',
            status: 'failed',
            result_json: 'stored failed result',
          },
          {
            id: `${prefix}-collision-target`,
            request_key: `request:${requestId}`,
            official_url: targetUrl,
            status: 'completed',
            result_json: 'stored completed result',
          },
          {
            id: `${prefix}-collision-other`,
            request_key: otherId,
            official_url: 'https://example.org/unrelated',
            status: 'pending',
            result_json: null,
          },
        ])}`;
        if (baseline === 'previous journal') {
          const {
            researchJobId: _jobId,
            officialUrlConfirmed: _confirmed,
            ...reviewedInput
          } = review('historical-job');
          reviewedInput.name = '충돌해도 보존할 편집';
          await session`update product_research_jobs set reviewed_input = ${JSON.stringify(reviewedInput)}::jsonb
            where id = ${`${prefix}-collision-target`}`;
        }
        const before = await session`select * from product_research_jobs order by id`;
        const history = await session`select * from __drizzle_migrations order by id`;
        await expect(migrate(database, { migrationsFolder, migrationsSchema })).rejects.toMatchObject({
          cause: {
            code: '23505',
            message:
              'Research request namespace migration refused: bare UUID and request:UUID identities conflict; no job history was changed',
          },
        });
        expect(await session`select * from product_research_jobs order by id`).toEqual(before);
        expect(await session`select * from __drizzle_migrations order by id`).toEqual(history);
        expect(await session`select id from product_research_jobs where request_key = ${otherId}`).toHaveLength(1);
        expect(
          await session`select id from product_research_jobs where request_key = ${`request:${otherId}`}`
        ).toHaveLength(0);
        const columns = await session`select column_name from information_schema.columns
          where table_schema = ${migrationsSchema} and table_name = 'product_research_jobs' order by column_name`;
        expect(columns.some(column => column.column_name === 'run_not_before')).toBe(baseline === 'previous journal');
      });
    },
    30_000
  );

  it('실제 DB와 GraphQL transport에서 UUID request identity, conflict 코드와 실패 이력을 보존한다', async () => {
    await withResearchGraphqlServer(db, async server => {
      const requestId = randomUUID();
      const officialUrl = `https://${prefix}.example:8443/product/a`;
      const request = (officialUrl: string, id = requestId) =>
        server.executeOperation({
          query:
            'mutation($input: RequestProductResearchInput!) { requestProductResearch(input: $input) { id officialUrl status } }',
          variables: { input: { requestId: id, officialUrl } },
        });
      const [a, b] = await Promise.all([request(officialUrl), request(officialUrl)]);
      if (a.body.kind !== 'single' || b.body.kind !== 'single') throw new Error('Expected single GraphQL response');
      expect(a.body.singleResult.errors).toBeUndefined();
      expect(b.body.singleResult.errors).toBeUndefined();
      expect(b.body.singleResult.data).toEqual(a.body.singleResult.data);
      const conflict = await request(`https://${prefix}.example:8443/product/b`);
      if (conflict.body.kind !== 'single') throw new Error('Expected single GraphQL response');
      expect(conflict.body.singleResult.errors?.[0]?.extensions?.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
      const rows =
        await sql`select id, official_url, status from product_research_jobs where request_key = ${`request:${requestId}`}`;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.official_url).toBe(officialUrl);
      await db
        .update(productResearchJobs)
        .set({ status: 'failed', errorCode: 'INVALID_GENERATION' })
        .where(eq(productResearchJobs.id, rows[0]!.id));
      const retryId = randomUUID();
      const retried = await server.executeOperation({
        query:
          'mutation($jobId: String!, $input: RetryProductResearchInput!) { retryProductResearch(jobId: $jobId, input: $input) { id status } }',
        variables: { jobId: rows[0]!.id, input: { requestId: retryId } },
      });
      if (retried.body.kind !== 'single') throw new Error('Expected single GraphQL response');
      expect(retried.body.singleResult.errors).toBeUndefined();
      const [retry] =
        await sql`select id, status from product_research_jobs where request_key = ${`request:${retryId}`}`;
      expect(retry?.id).not.toBe(rows[0]!.id);
      expect(retry?.status).toBe('pending');
      expect((await sql`select status from product_research_jobs where id = ${rows[0]!.id}`)[0]?.status).toBe('failed');
      await request(officialUrl, randomUUID());
      expect(await sql`select id from product_research_jobs where official_url = ${officialUrl}`).toHaveLength(3);
    });
  });

  it('resolves real Research services by Token and executes the materialize schema mutation', async () => {
    expect(Container.get(ProductResearchJobRepositoryToken)).toBeInstanceOf(PostgresqlProductResearchJobRepository);
    expect(Container.get(ProductResearchMaterializationRepositoryToken)).toBeInstanceOf(
      PostgresqlProductResearchMaterializationRepository
    );
    expect(Container.get(CategoryRepositoryToken)).toBeInstanceOf(PostgresqlCategoryRepository);
    expect(Container.get(ProductDescriptionApplyStoreToken)).toBeInstanceOf(PostgresqlProductDescriptionApplyStore);
    expect(Container.get(ApplyProductDescriptionCandidate)).toBeInstanceOf(ApplyProductDescriptionCandidate);
    Container.set(ProductResearchQueueService, {});
    Container.set(LlmClient, {});
    Container.set(LlmSettingService, {});
    expect(Container.get(ProductResearchService)).toBeInstanceOf(ProductResearchService);
    expect(Container.get(ProductResearchReviewService)).toBeInstanceOf(ProductResearchReviewService);
    const schema = buildSchemaSync({
      resolvers: [ProductResearchMutationResolver, ProductResearchQueryResolver],
      container: Container,
      authChecker: () => true,
    });
    const job = await research();
    const result = await graphql({
      schema,
      source:
        'mutation($input: MaterializeResearchedProductInput!) { materializeResearchedProduct(input: $input) { id slug publishedAt } }',
      variableValues: { input: review(job.id) },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.materializeResearchedProduct).toMatchObject({ publishedAt: null });
  });
});
