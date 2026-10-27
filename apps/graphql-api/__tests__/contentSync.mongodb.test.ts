import 'reflect-metadata';
import { GetAccount } from '@darun/accounts-domain';
import { PostgresqlMagazineRepository } from '@darun/magazines-datasource';
import { Magazine, PublishMagazine } from '@darun/magazines-domain';
import {
  PostgresqlProductRepository,
  PostgresqlProductTagRepository,
  PostgresqlProductFeatureRepository,
  PostgresqlProductDescriptionApplyStore,
  PostgresqlProductDescriptionEvidenceAssembler,
} from '@darun/products-datasource';
import {
  Product,
  PublishProduct,
  ApplyProductDescriptionCandidate,
  EditProduct,
  GetProduct,
  GetPublishedProduct,
  ProductContentSyncToken,
  ProductTag,
  Tag,
} from '@darun/products-domain';
import { DrizzleToken } from '@darun/provider-database';
import { MongodbSearchableProductRepository } from '@darun/search-datasource';
import { SearchableProduct } from '@darun/search-domain';
import {
  LlmTranslationProvider,
  PostgresqlTranslationJobRepository,
  PostgresqlTranslationRepository,
} from '@darun/translation-datasource';
import {
  TranslationService,
  type TranslationProvider,
  type ProductBundleTranslationRequest,
  type TranslationRow,
} from '@darun/translation-domain';
import { TranslationJobService } from '@darun/translation-service';
import { LlmClient } from '@darun/utils-llm';
import type { APIGatewayProxyHandlerV2, Handler, SQSHandler } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { print } from 'graphql';
import mongoose, { mongo } from 'mongoose';
import postgres, { type Sql } from 'postgres';
import { Container } from 'typedi';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash, generateKeyPairSync, randomUUID } from 'node:crypto';
import { createServer, connect, type Server, type Socket } from 'node:net';
import { resolve } from 'node:path';
import { EditProductOnEditProductDescriptionDocument } from '../../../libs/__generated__/graphql';
import { magazines } from '../../../libs/magazines/datasource/src/entities/MagazineSchema';
import { categories } from '../../../libs/products/datasource/src/entities/CategorySchema';
import { productContentSyncIntents } from '../../../libs/products/datasource/src/entities/ProductContentSyncIntentSchema';
import { productDescriptionJobs } from '../../../libs/products/datasource/src/entities/ProductDescriptionJobSchema';
import { productFeatures } from '../../../libs/products/datasource/src/entities/ProductFeaturesSchema';
import { productFlows, productFlowSteps } from '../../../libs/products/datasource/src/entities/ProductFlowsSchema';
import { products } from '../../../libs/products/datasource/src/entities/ProductSchema';
import { productScreenshots } from '../../../libs/products/datasource/src/entities/ProductScreenshotsSchema';
import { productScreenshotUiElements } from '../../../libs/products/datasource/src/entities/ProductScreenshotUiElementsSchema';
import { productTags } from '../../../libs/products/datasource/src/entities/ProductTagsSchema';
import { screenshotCleanupIntents } from '../../../libs/products/datasource/src/entities/ScreenshotCleanupIntentSchema';
import { tags } from '../../../libs/products/datasource/src/entities/TagSchema';
import { PostgresqlCategoryRepository } from '../../../libs/products/datasource/src/repositories/PostgresqlCategoryRepository';
import { PostgresqlProductFlowRepository } from '../../../libs/products/datasource/src/repositories/PostgresqlProductFlowRepository';
import { PostgresqlProductScreenshotRepository } from '../../../libs/products/datasource/src/repositories/PostgresqlProductScreenshotRepository';
import {
  beginProductContentWrite,
  ProductContentSyncRegistrarToken,
} from '../../../libs/products/datasource/src/repositories/productContentSync';
import { lockProductSource } from '../../../libs/products/datasource/src/repositories/productSourceMutex';
import { CreateProductFlow } from '../../../libs/products/domain/src/usecases/CreateProductFlow';
import { DeleteProductScreenshot } from '../../../libs/products/domain/src/usecases/DeleteProductScreenshot';
import { UpdateProductScreenshot } from '../../../libs/products/domain/src/usecases/UpdateProductScreenshot';
import { ProductMutationResolver } from '../../../libs/products/feature/src/Product.mutation.resolver';
import { ProductDescriptionQueryResolver } from '../../../libs/products/feature/src/ProductDescription.query.resolver';
import { ProductContentSyncQueueService } from '../../../libs/products/service/src/ProductContentSyncQueueService';
import { ScreenshotCleanupQueueService } from '../../../libs/products/service/src/ScreenshotCleanupQueueService';
import { SearchableProductModel } from '../../../libs/search/datasource/src/entities/SearchableProductSchema';
import {
  meaningChanges,
  meaningPreservingEdits,
  orderedListItemValueChange,
} from '../../../libs/translation/datasource/src/__tests__/descriptionMeaningTransitions.fixture';
import { translationJobs } from '../../../libs/translation/datasource/src/entities/TranslationJobSchema';
import { translations } from '../../../libs/translation/datasource/src/entities/TranslationSchema';
import { TRANSLATION_PROMPT_VERSION } from '../../../libs/translation/datasource/src/prompts/translationPrompt';
import { TranslationQueueService } from '../../../libs/translation/service/src/TranslationQueueService';
import { PostgresqlProductContentSync, registerProductContentSync } from '../src/adapters/PostgresqlProductContentSync';
import { PostgresqlScreenshotCleanup } from '../src/adapters/PostgresqlScreenshotCleanup';
import { PostgresqlTranslationSourceStore } from '../src/adapters/PostgresqlTranslationSourceStore';

const databaseUrl = process.env['CONTENT_SYNC_TEST_DATABASE_URL'];
const mongodbUrl = process.env['CONTENT_SYNC_TEST_MONGODB_URI'];
const suite = databaseUrl && mongodbUrl ? describe : describe.skip;
suite('durable publication sync in isolated PostgreSQL and MongoDB', () => {
  let connection: Sql;
  let db: PostgresJsDatabase;
  let repository: PostgresqlProductRepository;
  let sync: PostgresqlProductContentSync;
  let search: MongodbSearchableProductRepository;
  let proxy: Server;
  const sockets = new Set<Socket>();
  const proxyPort = Number(process.env['CONTENT_SYNC_TEST_PROXY_PORT'] ?? '27038');
  let api: APIGatewayProxyHandlerV2;
  let searchWorker: SQSHandler;
  let translationWorker: SQSHandler;
  let recoveryTick: Handler;
  const queue = new ProductContentSyncQueueService();
  const bundleRequests: ProductBundleTranslationRequest[] = [];
  let failTranslation = false;
  const provider: TranslationProvider = {
    translateSingle: async () => {
      throw new Error('Unexpected single translation');
    },
    translateProductBundle: async request => {
      bundleRequests.push(request);
      if (failTranslation) throw new Error('synthetic translation failure');
      return {
        product: {
          name: `English ${request.name}`,
          summary: 'English summary',
          description: '<p>English body</p>',
          nameSourceHash: '',
          summarySourceHash: '',
          descriptionSourceHash: '',
        },
        features: request.features.map(feature => ({
          id: feature.id,
          name: `English ${feature.name}`,
          summary: feature.summary ? 'English feature' : '',
          nameSourceHash: '',
          summarySourceHash: '',
        })),
        model: 'offline-fixture',
        promptVersion: 'sync-test',
      };
    },
  };
  beforeAll(async () => {
    const pg = new URL(databaseUrl!);
    const mongodb = new URL(mongodbUrl!);
    if (
      !['127.0.0.1', 'localhost'].includes(pg.hostname) ||
      pg.pathname !== '/darun_content_sync' ||
      !['127.0.0.1', 'localhost'].includes(mongodb.hostname)
    )
      throw new Error('Only isolated local content sync databases are allowed');
    connection = postgres(databaseUrl!, { prepare: false, max: 8 });
    db = drizzle(connection);
    await migrate(db, {
      migrationsFolder: resolve(process.cwd(), 'scripts/migrations'),
    });
    // Leftover intents and translation jobs from a previous run would consume
    // the tick's per-kind rediscovery limit and starve this suite's own rows.
    await connection`delete from screenshot_cleanup_intents`;
    await connection`delete from product_content_sync_intents`;
    await connection`delete from translation_jobs`;
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    Object.assign(process.env, {
      INFRA_ENV: 'local',
      RUNNING_ENV: 'sync-test',
      DATABASE_URL: databaseUrl,
      MONGODB_URI: `mongodb://127.0.0.1:${proxyPort}`,
      FIREBASE_PROJECT_ID: 'sync-test',
      FIREBASE_CLIENT_EMAIL: 'sync@example.invalid',
      FIREBASE_PRIVATE_KEY: privateKey,
      CLOUDINARY_CLOUD_NAME: 'sync-test',
      CLOUDINARY_API_KEY: 'sync-test',
      CLOUDINARY_API_SECRET: 'sync-test',
      VOTE_IP_SALT: 'sync-test',
      CURSOR_SIGNATURE_SECRET: 'sync-test',
    });
    // Intentionally load real cold-start modules only after isolated credentials are installed.
    await import('../src/config');
    const database = await import('../src/config/database');
    database.createPostgresConnection();
    Container.set(DrizzleToken, db);
    Container.set(ProductContentSyncRegistrarToken, {
      register: registerProductContentSync,
    });
    repository = new PostgresqlProductRepository(db as never);
    search = new MongodbSearchableProductRepository(database.createMongodbConnection);
    sync = new PostgresqlProductContentSync(db as never, search, queue);
    Container.set(PostgresqlProductContentSync, sync);
    Container.set(ProductContentSyncToken, sync);
    // Authentication is the only API fixture seam; all canonical writes and sync paths below are real.
    Container.set(GetAccount, {
      execute: async () => ({ id: 'offline-admin', roles: ['admin'] }),
    } as never);
    const apply = new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(db as never));
    const resolver = new ProductMutationResolver(
      {} as never,
      {} as never,
      new EditProduct(repository),
      {} as never,
      new GetProduct(repository),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      new UpdateProductScreenshot(new PostgresqlProductScreenshotRepository(db as never)),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      new GetPublishedProduct(repository),
      {} as never,
      sync,
      apply
    );
    Container.set(ProductMutationResolver, resolver);
    Container.set(
      ProductDescriptionQueryResolver,
      new ProductDescriptionQueryResolver({} as never, sync, new GetProduct(repository))
    );
    Container.set(
      TranslationJobService,
      new TranslationJobService(
        new GetProduct(repository),
        provider,
        new PostgresqlTranslationJobRepository(db as never),
        new PostgresqlTranslationSourceStore(db as never),
        new TranslationQueueService()
      )
    );
    api = (await import('../src/functions/graphql')).handler;
    searchWorker = (await import('../src/functions/product-content-sync-worker')).handler;
    translationWorker = (await import('../src/functions/translation-worker')).handler;
    recoveryTick = (await import('../src/functions/job-recovery-tick')).handler;
  }, 30_000);
  afterAll(async () => {
    await mongoose.disconnect();
    for (const socket of sockets) socket.destroy();
    if (proxy?.listening)
      await new Promise<void>((resolve, reject) => proxy.close(error => (error ? reject(error) : resolve())));
    await connection?.end({ timeout: 5 });
    Container.reset();
  });
  async function seed() {
    const [product] = await db
      .insert(products)
      .values({
        name: '원래 이름',
        slug: randomUUID(),
        summary: '요약',
        description: '<p>본문</p>',
        logoUrl: 'logo',
        publishedAt: new Date(),
      })
      .returning();
    return product!;
  }
  it('기존 recovery tick과 전용 SQS handler가 commit된 cleanup을 처리한다', async () => {
    const product = await seed();
    const [screenshot] = await db
      .insert(productScreenshots)
      .values({
        productId: product.id,
        imageUrl: 'https://res.cloudinary.com/synthetic/image/upload/v1/fixture.png',
        imageAlt: '정리할 화면',
      })
      .returning();
    await new DeleteProductScreenshot(
      new PostgresqlProductScreenshotRepository(db as never),
      new PostgresqlProductFlowRepository(db as never)
    ).execute(screenshot!.id);
    const [job] = await db
      .select()
      .from(screenshotCleanupIntents)
      .where(eq(screenshotCleanupIntents.screenshotId, screenshot!.id));
    const images = { delete: vi.fn(async () => {}) };
    const sendIntent = vi.fn().mockResolvedValue(true);
    const previousCleanup = Container.get(PostgresqlScreenshotCleanup);
    Container.set(
      PostgresqlScreenshotCleanup,
      new PostgresqlScreenshotCleanup(db as never, images, {
        sendIntent,
      } as never)
    );
    try {
      await recoveryTick({}, {} as never, () => {});
      expect(sendIntent).toHaveBeenCalledWith(job!.id);
      expect(images.delete).not.toHaveBeenCalled();
      const worker = (await import('../src/functions/screenshot-cleanup-worker')).handler;
      await worker({ Records: [{ body: JSON.stringify({ intentId: job!.id }) }] } as never, {} as never, () => {});
      await worker({ Records: [{ body: JSON.stringify({ intentId: job!.id }) }] } as never, {} as never, () => {});
      expect(images.delete).toHaveBeenCalledExactlyOnceWith(screenshot!.imageUrl);
      expect(
        (await db.select().from(screenshotCleanupIntents).where(eq(screenshotCleanupIntents.id, job!.id)))[0]
      ).toMatchObject({ status: 'completed', attemptCount: 1 });
      await expect(
        worker(
          {
            Records: [{ body: JSON.stringify({ imageUrl: 'untrusted' }) }],
          } as never,
          {} as never,
          () => {}
        )
      ).rejects.toThrow('SCREENSHOT_CLEANUP_QUEUE_IDENTITY_INVALID');
    } finally {
      Container.set(PostgresqlScreenshotCleanup, previousCleanup);
    }
  });

  it('Visual gallery returns three ordered previews per app in one SQL batch', async () => {
    const appIds = Array.from({ length: 24 }, () => randomUUID().slice(0, 26));
    await db.insert(productScreenshots).values(
      appIds.flatMap(productId =>
        [1, 2, 3, 4, 5].map(priority => ({
          productId,
          imageUrl: `https://fixture.invalid/${priority}.png`,
          imageAlt: 'preview',
          priority,
        }))
      )
    );
    const queries: string[] = [];
    const previewRepository = new PostgresqlProductRepository(
      drizzle(connection, {
        logger: {
          logQuery(query) {
            queries.push(query);
          },
        },
      }) as never
    );
    const previews = await Promise.all(
      [...appIds, 'missing-preview-app'].map(id => previewRepository.findVisualAppPreviews(id))
    );
    expect(queries).toHaveLength(1);
    expect(previews[24]).toEqual([]);
    for (const group of previews.slice(0, 24)) {
      expect(group.map(screen => screen.imageUrl)).toEqual(
        [5, 4, 3].map(priority => `https://fixture.invalid/${priority}.png`)
      );
    }
  });

  it.each([
    {
      name: '생략',
      referenced: false,
      patch: {},
      expected: { title: '기존 제목', platform: 'WEB', screenType: 'HOME' },
      rejected: false,
    },
    {
      name: '명시적 삭제',
      referenced: false,
      patch: { title: null, platform: null, screenType: null },
      expected: { title: null, platform: null, screenType: null },
      rejected: false,
    },
    {
      name: '전체 변경',
      referenced: false,
      patch: { title: '  새 제목  ', platform: 'IOS', screenType: 'SIGN_IN' },
      expected: { title: '새 제목', platform: 'IOS', screenType: 'SIGN_IN' },
      rejected: false,
    },
    {
      name: '참조 중 생략',
      referenced: true,
      patch: {},
      expected: { title: '기존 제목', platform: 'WEB', screenType: 'HOME' },
      rejected: false,
    },
    {
      name: '참조 중 같은 플랫폼과 일부 삭제',
      referenced: true,
      patch: { platform: 'WEB', title: null },
      expected: { title: null, platform: 'WEB', screenType: 'HOME' },
      rejected: false,
    },
    {
      name: '참조 중 플랫폼 삭제',
      referenced: true,
      patch: {
        title: null,
        platform: null,
        screenType: null,
        uiElements: ['BUTTON'],
      },
      expected: {},
      rejected: true,
    },
    {
      name: '참조 중 플랫폼 변경',
      referenced: true,
      patch: { title: '새 제목', platform: 'IOS', uiElements: ['BUTTON'] },
      expected: {},
      rejected: true,
    },
  ])('실제 GraphQL 스크린샷 부분 수정: $name', async ({ referenced, patch, expected, rejected }) => {
    const product = await seed();
    const [screenshot] = await db
      .insert(productScreenshots)
      .values({
        productId: product.id,
        imageUrl: 'https://fixture.invalid/screen.png',
        imageAlt: '기존 alt',
        title: '기존 제목',
        platform: 'WEB',
        screenType: 'HOME',
      })
      .returning();
    await db.insert(productScreenshotUiElements).values({ screenshotId: screenshot!.id, element: 'CARD' });
    if (referenced) {
      const [flow] = await db
        .insert(productFlows)
        .values({
          productId: product.id,
          title: '가입 플로',
          platform: 'WEB',
          flowType: 'SIGN_UP',
        })
        .returning();
      await db.insert(productFlowSteps).values({
        flowId: flow!.id,
        screenshotId: screenshot!.id,
        position: 0,
      });
    }
    const snapshot = async () => ({
      product: (await db.select().from(products).where(eq(products.id, product.id)))[0],
      screenshot: (await db.select().from(productScreenshots).where(eq(productScreenshots.id, screenshot!.id)))[0],
      elements: await db
        .select()
        .from(productScreenshotUiElements)
        .where(eq(productScreenshotUiElements.screenshotId, screenshot!.id)),
      intents: await intents(product.id),
      jobs: await db.select().from(translationJobs).where(eq(translationJobs.entityId, product.id)),
    });
    const before = await snapshot();
    const result = await mutate(
      'mutation($input: UpdateProductScreenshotInput!) { updateProductScreenshot(input: $input) { screenshot { id imageAlt title platform screenType } } }',
      { input: { id: screenshot!.id, imageAlt: '  새 alt  ', ...patch } }
    );
    if (rejected) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].extensions.code).toBe('product-screenshot/in-use');
      expect(await snapshot()).toEqual(before);
    } else {
      expect(result.errors).toBeUndefined();
      expect(result.data.updateProductScreenshot.screenshot).toEqual({
        id: screenshot!.id,
        imageAlt: '새 alt',
        ...expected,
      });
      const after = await snapshot();
      expect(after.screenshot).toMatchObject({
        imageAlt: '새 alt',
        ...expected,
      });
      expect(after.elements).toEqual(before.elements);
      expect(after.product!.contentRevision).toBe(before.product!.contentRevision + BigInt(1));
      expect(after.intents).toHaveLength(before.intents.length + 1);
      expect(after.intents.at(-1)?.sourceRevision).toBe(after.product!.contentRevision);
    }
  });

  async function intents(productId: string) {
    return db.select().from(productContentSyncIntents).where(eq(productContentSyncIntents.productId, productId));
  }
  const context = {
    awsRequestId: 'sync-test',
    getRemainingTimeInMillis: () => 300000,
    callbackWaitsForEmptyEventLoop: false,
  } as never;
  async function mutate(source: string, variables: Record<string, unknown>) {
    const response = await api(
      {
        version: '2.0',
        routeKey: 'POST /graphql',
        rawPath: '/graphql',
        rawQueryString: '',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer offline-fixture',
        },
        requestContext: {
          requestId: 'sync-test',
          http: { method: 'POST', path: '/graphql', sourceIp: '127.0.0.1' },
        },
        body: JSON.stringify({ query: source, variables }),
        isBase64Encoded: false,
      } as never,
      context,
      () => {}
    );
    if (!response || typeof response !== 'object' || !('body' in response) || typeof response.body !== 'string')
      throw new Error('API response is missing');
    return JSON.parse(response.body);
  }
  it('비어 있지 않은 상품 목록의 커서로 다음 페이지를 조회한다', async () => {
    const categoryId = `cursor-${randomUUID().slice(0, 16)}`;
    const firstId = `${categoryId}-a`;
    const secondId = `${categoryId}-b`;
    await connection`INSERT INTO categories (id, slug, label_ko, label_en)
      VALUES (${categoryId}, ${categoryId}, '커서 검사', 'Cursor fixture')`;
    await connection`INSERT INTO products (id, slug, name, summary, logo_url, category_ids, published_at) VALUES
      (${firstId}, ${firstId}, 'First', 'First summary', 'https://fixture.invalid/first.png', ${JSON.stringify([categoryId])}::json, now()),
      (${secondId}, ${secondId}, 'Second', 'Second summary', 'https://fixture.invalid/second.png', ${JSON.stringify([categoryId])}::json, now())`;
    const query = `query($slug: String!, $after: String) {
      productsByCategory(slug: $slug, first: 1, after: $after) {
        totalCount edges { node { id } cursor } pageInfo { hasNextPage endCursor }
      }
    }`;
    const first = await mutate(query, { slug: categoryId });
    expect(first.errors).toBeUndefined();
    expect(first.data.productsByCategory).toMatchObject({
      totalCount: 2,
      edges: [{ node: { id: secondId }, cursor: expect.any(String) }],
      pageInfo: { hasNextPage: true, endCursor: expect.any(String) },
    });
    const next = await mutate(query, { slug: categoryId, after: first.data.productsByCategory.pageInfo.endCursor });
    expect(next.errors).toBeUndefined();
    expect(next.data.productsByCategory).toMatchObject({
      totalCount: 2,
      edges: [{ node: { id: firstId } }],
      pageInfo: { hasNextPage: false },
    });
  });

  async function runSearch(intentId: string) {
    await searchWorker(
      {
        Records: [{ messageId: randomUUID(), body: JSON.stringify({ intentId }) }],
      } as never,
      context,
      () => {}
    );
  }
  async function runTranslation(jobId: string, productId: string) {
    await translationWorker(
      {
        Records: [
          {
            messageId: randomUUID(),
            body: JSON.stringify({
              jobId,
              entityType: 'Product',
              entityId: productId,
            }),
          },
        ],
      } as never,
      context,
      () => {}
    );
  }

  async function withOfflineTranslationWorker(
    run: (modelCalls: () => number) => Promise<void>,
    reviewTranslation?: (encodedJson: string) => string
  ) {
    const previousService = Container.get(TranslationJobService);
    const previousClient = Container.get(LlmClient);
    const queueUrl = process.env['TRANSLATION_QUEUE_URL'];
    process.env['TRANSLATION_QUEUE_URL'] = '';
    const client = new LlmClient({
      getConfig: async () => ({
        endpoint: 'http://127.0.0.1:1/v1',
        apiKey: 'offline-only',
        model: 'offline-readsync',
        thinkingLevel: null,
      }),
    });
    // Only raw model I/O is synthetic: provider validation, worker fencing and DB commit stay real.
    const completion = vi.spyOn(client, 'completion').mockImplementation(async (_model, messages) => {
      const prompt = messages![1]!.content;
      const source = prompt.split('번역할 원본 데이터 (JSON):\n')[1]!.split('\n\n검토할 번역 초안:')[0]!;
      const translated = source
        .replaceAll('원래 이름', 'Original name')
        .replaceAll('요약', 'Summary')
        .replaceAll('다른 본문', 'Changed body')
        .replaceAll('본문', 'Body')
        .replaceAll('안내', 'Guide')
        .replaceAll('기능', 'Feature')
        .replaceAll('소개', 'Introduction')
        .replaceAll('주의', 'Warning')
        .replaceAll('조건', 'Condition');
      return {
        role: 'assistant',
        refusal: null,
        content: prompt.includes('검토할 번역 초안:') && reviewTranslation ? reviewTranslation(translated) : translated,
      };
    });
    const remote = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Remote calls forbidden in READSYNC'));
    Container.set(LlmClient, client);
    Container.set(
      TranslationJobService,
      new TranslationJobService(
        new GetProduct(repository),
        new LlmTranslationProvider(client),
        new PostgresqlTranslationJobRepository(db as never),
        new PostgresqlTranslationSourceStore(db as never),
        new TranslationQueueService()
      )
    );
    try {
      await run(() => completion.mock.calls.length);
      expect(remote).not.toHaveBeenCalled();
    } finally {
      completion.mockRestore();
      remote.mockRestore();
      Container.set(TranslationJobService, previousService);
      Container.set(LlmClient, previousClient);
      if (queueUrl === undefined) delete process.env['TRANSLATION_QUEUE_URL'];
      else process.env['TRANSLATION_QUEUE_URL'] = queueUrl;
    }
  }

  async function requestTranslation(product: typeof products.$inferSelect) {
    const response = await mutate(
      'mutation($slug:String!){requestProductTranslation(slug:$slug){id entityId status fields}}',
      { slug: product.slug }
    );
    expect(response.errors).toBeUndefined();
    const job = response.data.requestProductTranslation as { id: string; status: string };
    expect(job.status).toBe('pending');
    expect((await db.select().from(translationJobs).where(eq(translationJobs.id, job.id)))[0]).toMatchObject({
      entityId: product.id,
      status: 'pending',
      attemptCount: 0,
      sourceHash: null,
      fields: ['name', 'summary', 'description', 'features'],
    });
    return job.id;
  }

  async function expectPublicDescription(product: typeof products.$inferSelect, source: string, value: string) {
    const reads = new TranslationService(new PostgresqlTranslationRepository(db as never));
    expect(
      await reads.getTranslation({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        field: 'description',
        koreanValue: source,
      })
    ).toBe(value);
    const batch = await reads.getTranslations({
      entityType: 'Product',
      locale: 'en',
      entries: [{ entityId: product.id, field: 'description', koreanValue: source }],
    });
    expect(batch.get(`${product.id}:description`)).toBe(value);
    const response = await mutate(
      'query($slug:String!){productBySlug(slug:$slug,locale:"en"){description} recentProducts(first:10,locale:"en"){id description}}',
      { slug: product.slug }
    );
    expect(response.errors).toBeUndefined();
    expect(response.data.productBySlug.description).toBe(value);
    expect(response.data.recentProducts.find((row: { id: string }) => row.id === product.id)?.description).toBe(value);
  }

  async function freshness(productId: string) {
    const response = await mutate(
      'query($id:String!){translationFreshness(entityType:"Product",entityId:$id,fields:["name","summary","description","features"]){entityType entityId field status}}',
      { id: productId }
    );
    expect(response.errors).toBeUndefined();
    return response.data.translationFreshness as Array<{
      entityType: string;
      entityId: string;
      field: string;
      status: string;
    }>;
  }

  async function storedTranslations(productId: string) {
    const source = await new PostgresqlTranslationSourceStore(db as never).read({
      entityType: 'Product',
      entityId: productId,
      fields: ['name', 'summary', 'description', 'features'],
    });
    const translationRepository = new PostgresqlTranslationRepository(db as never);
    return Promise.all(source.values.map(value => translationRepository.findOne({ ...value, locale: 'en' })));
  }

  async function translatedDescription(original: string) {
    const product = await seed();
    await db.update(products).set({ description: original }).where(eq(products.id, product.id));
    const firstId = await requestTranslation(product);
    await runTranslation(firstId, product.id);
    const priorRows = await storedTranslations(product.id);
    const priorJobs = await db.select().from(translationJobs).where(eq(translationJobs.entityId, product.id));
    const firstJob = priorJobs.find(job => job.id === firstId);
    return { product, firstId, firstJob, priorRows, priorJobs };
  }

  interface TranslatedDescription {
    product: typeof products.$inferSelect;
    firstId: string;
    firstJob: typeof translationJobs.$inferSelect | undefined;
    priorRows: Array<TranslationRow | null>;
    priorJobs: Array<typeof translationJobs.$inferSelect>;
  }

  async function pendingDescriptionEdit(previous: TranslatedDescription, changed: string, modelCalls: () => number) {
    const { product, firstId, firstJob, priorRows } = previous;
    const edited = await mutate(print(EditProductOnEditProductDescriptionDocument), {
      slug: product.slug,
      input: { description: changed },
    });
    expect(edited.errors).toBeUndefined();
    expect(edited.data.editProduct.product.description).toBe(changed);
    expect((await db.select().from(products).where(eq(products.id, product.id)))[0]).toMatchObject({
      description: changed,
      contentRevision: 1n,
    });
    const registered = await intents(product.id);
    expect(registered.map(row => row.kind).sort()).toEqual(['search', 'translation']);
    expect(registered.every(row => row.sourceRevision === 1n)).toBe(true);
    const translation = registered.find(row => row.kind === 'translation')!;
    const [pending] = await db
      .select()
      .from(translationJobs)
      .where(eq(translationJobs.id, translation.translationJobId!));
    expect(pending).toMatchObject({
      status: 'pending',
      attemptCount: 0,
      sourceHash: null,
      fields: ['name', 'summary', 'description', 'features'],
      idempotencyKey: `sync:${product.id}:1:translation`,
    });
    await expectPublicDescription(product, changed, changed);
    expect((await freshness(product.id)).find(row => row.field === 'description')?.status).toBe('stale');
    expect(await storedTranslations(product.id)).toEqual(priorRows);
    expect((await db.select().from(translationJobs).where(eq(translationJobs.id, firstId)))[0]).toEqual(firstJob);
    expect(modelCalls()).toBe(2);
    return { registered, translation };
  }

  async function completeDescriptionTranslation(
    previous: TranslatedDescription,
    translation: typeof productContentSyncIntents.$inferSelect,
    changed: string,
    english: string,
    modelCalls: () => number
  ) {
    const { product, firstId, firstJob } = previous;
    await runTranslation(translation.translationJobId!, product.id);
    expect(await sync.status(translation.id)).toMatchObject({ status: 'completed' });
    expect(
      (await db.select().from(translationJobs).where(eq(translationJobs.id, translation.translationJobId!)))[0]
    ).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      model: 'offline-readsync',
      promptVersion: firstJob!.promptVersion,
    });
    expect((await storedTranslations(product.id)).find(row => row?.field === 'description')).toMatchObject({
      value: english,
      sourceHash: `document:v1:${createHash('sha256').update(changed.replace(/\r\n/g, '\n')).digest('hex')}`,
      model: 'offline-readsync',
      promptVersion: firstJob!.promptVersion,
    });
    await expectPublicDescription(product, changed, english);
    expect((await freshness(product.id)).every(row => row.status === 'current')).toBe(true);
    expect((await db.select().from(translationJobs).where(eq(translationJobs.id, firstId)))[0]).toEqual(firstJob);
    expect(modelCalls()).toBe(4);
  }

  async function searchOnlyDescriptionEdit(previous: TranslatedDescription, changed: string, modelCalls: () => number) {
    const { product, priorRows, priorJobs } = previous;
    const edited = await mutate(print(EditProductOnEditProductDescriptionDocument), {
      slug: product.slug,
      input: { description: changed },
    });
    expect(edited.errors).toBeUndefined();
    const registered = await intents(product.id);
    expect(registered).toEqual([
      expect.objectContaining({ kind: 'search', sourceRevision: 1n, translationJobId: null }),
    ]);
    await runSearch(registered[0]!.id);
    expect(await sync.status(registered[0]!.id)).toMatchObject({ status: 'completed' });
    expect((await SearchableProductModel.collection.findOne({ productId: product.id }))?.description).toBe(changed);
    await expectPublicDescription(product, changed, changed);
    expect((await freshness(product.id)).find(row => row.field === 'description')?.status).toBe('stale');
    expect(await storedTranslations(product.id)).toEqual(priorRows);
    expect(await db.select().from(translationJobs).where(eq(translationJobs.entityId, product.id))).toEqual(priorJobs);
    expect(modelCalls()).toBe(2);
  }

  it('생성된 관리자 소개 저장 문서와 실제 bundled API의 canonical input 이름이 일치한다', async () => {
    const product = await seed();
    const html =
      '<h2>검증 제목</h2><ul><li>검증 목록</li></ul><blockquote><p>검증 인용</p></blockquote><p><a href="https://example.com/docs?a=1">검증 링크</a> 검증 본문</p>';
    const result = await mutate(print(EditProductOnEditProductDescriptionDocument), {
      slug: product.slug,
      input: { description: html },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data.editProduct.product.description).toBe(html);
    const fragments = await mutate(
      'query($slug:String!){tempProductBySlug(slug:$slug){...ProductContract}} fragment ProductContract on Product {id links {...LinkContract}} fragment LinkContract on Link {id link}',
      { slug: product.slug }
    );
    expect(fragments.errors).toBeUndefined();
    expect(fragments.data.tempProductBySlug.id).toBe(product.id);
  });

  it('Mongo unavailable cold start에서도 실제 API 편집/Apply와 번역 worker가 성공하고 검색만 남는다', async () => {
    const product = await seed();
    const edited = await mutate(
      'mutation($slug:String!){ editProduct(slug:$slug,input:{name:"새 이름"}) { product { name } } }',
      { slug: product.slug }
    );
    expect(edited.errors).toBeUndefined();
    expect(edited.data.editProduct.product.name).toBe('새 이름');
    const evidence = await new PostgresqlProductDescriptionEvidenceAssembler(db as never).assemble(product.id);
    const [candidate] = await db
      .insert(productDescriptionJobs)
      .values({
        productId: product.id,
        status: 'completed',
        candidateHtml: '<p>검토한 소개</p>',
        evidenceHash: evidence.evidenceHash,
        evidenceHashVersion: 'v2',
        baseDescriptionHash: evidence.baseDescriptionHash,
      })
      .returning();
    const applied = await mutate(
      'mutation($id:String!){ applyProductDescriptionCandidate(jobId:$id) { alreadyApplied product { description } } }',
      { id: candidate!.id }
    );
    expect(applied.errors).toBeUndefined();
    expect(applied.data.applyProductDescriptionCandidate.product.description).toBe('<p>검토한 소개</p>');
    const pending = (await intents(product.id)).filter(row => row.status === 'pending');
    const translation = pending.find(row => row.kind === 'translation')!;
    const searchIntent = pending.find(row => row.kind === 'search')!;
    await runTranslation(translation.translationJobId!, product.id);
    await runSearch(searchIntent.id);
    expect(await sync.status(translation.id)).toMatchObject({
      status: 'completed',
    });
    expect(await sync.status(searchIntent.id)).toMatchObject({
      status: 'failed',
      error: 'SEARCH_UNAVAILABLE',
    });
    expect((await db.select().from(translations).where(eq(translations.entityId, product.id))).length).toBe(3);
    const revision = (await db.select().from(products).where(eq(products.id, product.id)))[0]!.contentRevision;
    const replay = await mutate(
      'mutation($id:String!){ applyProductDescriptionCandidate(jobId:$id) { alreadyApplied } }',
      { id: candidate!.id }
    );
    expect(replay.data.applyProductDescriptionCandidate.alreadyApplied).toBe(true);
    expect((await db.select().from(products).where(eq(products.id, product.id)))[0]!.contentRevision).toBe(revision);
    // Restore the same URI after failed cold-start connection; the lazy connector must retry.
    const target = new URL(mongodbUrl!);
    proxy = createServer(inbound => {
      const outbound = connect({
        host: target.hostname,
        port: Number(target.port || '27017'),
      });
      for (const socket of [inbound, outbound]) {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
      }
      inbound.on('error', () => outbound.destroy());
      outbound.on('error', () => inbound.destroy());
      inbound.pipe(outbound).pipe(inbound);
    });
    await new Promise<void>(resolve => proxy.listen(proxyPort, '127.0.0.1', resolve));
    await db
      .update(productContentSyncIntents)
      .set({ retryAfter: new Date(0) })
      .where(eq(productContentSyncIntents.id, searchIntent.id));
    await runSearch(searchIntent.id);
    expect(await sync.status(searchIntent.id)).toMatchObject({
      status: 'completed',
    });
    const row = await SearchableProductModel.collection.findOne({ productId: product.id }, { promoteLongs: false });
    expect(row?.name).toBe('새 이름');
    expect(row?.description).toBe('<p>검토한 소개</p>');
    expect(row?.sourceRevision.toString()).toBe(revision.toString());
  }, 25_000);

  it('name N 뒤 Tag N+1은 N translation을 대체하지 않고 현재 원문을 한 번 번역한다', async () => {
    const product = await seed();
    await repository.updateById(product.id, value => {
      value.update({ name: '비대칭 이름' });
      return value;
    });
    const first = (await intents(product.id)).find(row => row.kind === 'translation')!;
    await new PostgresqlProductTagRepository(db as never).upsert(
      new ProductTag({
        productId: product.id,
        tags: [new Tag({ name: '새 태그' })],
      })
    );
    const rows = await intents(product.id);
    expect(rows.filter(row => row.kind === 'translation')).toHaveLength(1);
    expect(rows.find(row => row.id === first.id)?.status).toBe('pending');
    const jobs = await db.select().from(translationJobs).where(eq(translationJobs.entityId, product.id));
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.idempotencyKey).toBe(`sync:${product.id}:1:translation`);
    const calls = bundleRequests.length;
    await Promise.all([
      runTranslation(first.translationJobId!, product.id),
      runTranslation(first.translationJobId!, product.id),
    ]);
    expect(bundleRequests.length - calls).toBe(1);
    expect(bundleRequests.at(-1)?.name).toBe('비대칭 이름');
    expect(await sync.status(first.id)).toMatchObject({ status: 'completed' });
  });

  it('동일 내용·UI metadata·의미 동일 서식은 불필요한 translation job을 만들지 않는다', async () => {
    const product = await seed();
    await repository.updateById(product.id, value => {
      value.update({ logoUrl: 'other-logo', name: value.name });
      return value;
    });
    expect(await intents(product.id)).toHaveLength(0);
    await repository.updateById(product.id, value => {
      value.update({
        description: '<p class="display"><strong>본문</strong></p>',
      });
      return value;
    });
    expect((await intents(product.id)).map(row => row.kind)).toEqual(['search']);
    await new PostgresqlProductFeatureRepository(db as never).insert({
      id: product.id,
      productId: product.id,
      name: '기능',
      summary: '조건',
      emoji: '🔎',
    } as never);
    expect((await intents(product.id)).filter(row => row.kind === 'translation')).toHaveLength(1);
  });

  it('실제 worker 저장 뒤 서식 편집은 search-only·한국어 fallback·stale이고 명시 재번역으로 current를 복구한다', async () => {
    await withOfflineTranslationWorker(async modelCalls => {
      const product = await seed();
      const [feature] = await db
        .insert(productFeatures)
        .values({
          productId: product.id,
          name: '기능',
          summary: '조건',
          emoji: '🔎',
        })
        .returning();
      const firstId = await requestTranslation(product);
      await runTranslation(firstId, product.id);
      const [firstJob] = await db.select().from(translationJobs).where(eq(translationJobs.id, firstId));
      expect(firstJob).toMatchObject({ status: 'completed', attemptCount: 1, model: 'offline-readsync' });
      const priorRows = await storedTranslations(product.id);
      expect(priorRows).toHaveLength(5);
      expect(priorRows.every(row => row?.sourceHash && row.model === 'offline-readsync' && row.promptVersion)).toBe(
        true
      );
      expect(priorRows.find(row => row?.field === 'description')).toMatchObject({
        value: '<p>Body</p>',
        sourceHash: `document:v1:${createHash('sha256').update('<p>본문</p>'.replace(/\r\n/g, '\n')).digest('hex')}`,
      });
      await expectPublicDescription(product, '<p>본문</p>', '<p>Body</p>');
      expect((await freshness(product.id)).map(row => row.status)).toEqual(Array(5).fill('current'));
      const featureRead = await mutate(
        'query($slug:String!){productBySlug(slug:$slug,locale:"en"){features{id name summary}}}',
        { slug: product.slug }
      );
      expect(featureRead.errors).toBeUndefined();
      expect(featureRead.data.productBySlug.features).toEqual([
        { id: feature!.id, name: 'Feature', summary: 'Condition' },
      ]);
      const featureBatch = await new TranslationService(
        new PostgresqlTranslationRepository(db as never)
      ).getTranslations({
        entityType: 'ProductFeature',
        locale: 'en',
        entries: [{ entityId: feature!.id, field: 'name', koreanValue: '기능' }],
      });
      expect(featureBatch.get(`${feature!.id}:name`)).toBe('Feature');
      expect(modelCalls()).toBe(2);

      const formatted = '<p class="display"><strong>본문</strong></p>';
      const edited = await mutate(print(EditProductOnEditProductDescriptionDocument), {
        slug: product.slug,
        input: { description: formatted },
      });
      expect(edited.errors).toBeUndefined();
      expect(edited.data.editProduct.product.description).toBe(formatted);
      const registered = await intents(product.id);
      expect(registered).toEqual([
        expect.objectContaining({ kind: 'search', sourceRevision: 1n, translationJobId: null }),
      ]);
      expect(await db.select().from(translationJobs).where(eq(translationJobs.entityId, product.id))).toEqual([
        firstJob,
      ]);
      await runSearch(registered[0]!.id);
      expect(await sync.status(registered[0]!.id)).toMatchObject({ status: 'completed' });
      expect((await SearchableProductModel.collection.findOne({ productId: product.id }))?.description).toBe(formatted);
      await expectPublicDescription(product, formatted, formatted);
      const stale = await freshness(product.id);
      expect(stale.find(row => row.field === 'description')).toMatchObject({ status: 'stale' });
      expect(stale.filter(row => row.field !== 'description').every(row => row.status === 'current')).toBe(true);
      // Canonical edit, index and later reads neither call the model nor rewrite any old result/provenance.
      expect(modelCalls()).toBe(2);
      expect(await storedTranslations(product.id)).toEqual(priorRows);
      expect(await db.select().from(translationJobs).where(eq(translationJobs.entityId, product.id))).toEqual([
        firstJob,
      ]);

      const retryId = await requestTranslation(product);
      expect(retryId).not.toBe(firstId);
      await runTranslation(retryId, product.id);
      expect((await db.select().from(translationJobs).where(eq(translationJobs.id, retryId)))[0]).toMatchObject({
        status: 'completed',
        attemptCount: 1,
        model: 'offline-readsync',
        promptVersion: firstJob!.promptVersion,
      });
      const currentRows = await storedTranslations(product.id);
      expect(currentRows).toHaveLength(5);
      expect(currentRows.find(row => row?.field === 'description')).toMatchObject({
        value: '<p class="display"><strong>Body</strong></p>',
        sourceHash: `document:v1:${createHash('sha256').update(formatted.replace(/\r\n/g, '\n')).digest('hex')}`,
        model: 'offline-readsync',
        promptVersion: firstJob!.promptVersion,
      });
      await expectPublicDescription(product, formatted, '<p class="display"><strong>Body</strong></p>');
      expect((await freshness(product.id)).every(row => row.status === 'current')).toBe(true);
      expect((await db.select().from(translationJobs).where(eq(translationJobs.id, firstId)))[0]).toEqual(firstJob);
      expect((await intents(product.id)).map(row => row.kind)).toEqual(['search']);
      expect(modelCalls()).toBe(4);
    });
  }, 20_000);

  it.each(['tableColumnSpan', 'tableRowSpan', 'tableRowGroupSpan', 'tableNegativeZeroRowSpan'] as const)(
    '%s 변경은 canonical 저장과 번역을 등록하고 worker 완료 후 영어 표를 current로 읽는다',
    async key => {
      const { source, english } = meaningChanges[key];
      await withOfflineTranslationWorker(async modelCalls => {
        const previous = await translatedDescription(source[0]);
        await expectPublicDescription(previous.product, source[0], english[0]);
        const { translation } = await pendingDescriptionEdit(previous, source[1], modelCalls);
        await completeDescriptionTranslation(previous, translation, source[1], english[1], modelCalls);
      });
    },
    20_000
  );

  it('표의 같은 유효 범위·장식만 바꾸면 search-only이며 기존 영어와 provenance를 보존한다', async () => {
    const { source, english } = meaningPreservingEdits.tableSpanNotation;
    await withOfflineTranslationWorker(async modelCalls => {
      const previous = await translatedDescription(source[0]);
      await expectPublicDescription(previous.product, source[0], english);
      await searchOnlyDescriptionEdit(previous, source[1], modelCalls);
    });
  });

  it.each([
    [
      '의미',
      '<p><a href="https://example.com/docs">다른 본문</a></p>',
      '<p><a href="https://example.com/docs">Changed body</a></p>',
    ],
    [
      'URL',
      '<p><a href="https://example.com/other">본문</a></p>',
      '<p><a href="https://example.com/other">Body</a></p>',
    ],
    [
      '문서 구조',
      '<h2><a href="https://example.com/docs">본문</a></h2>',
      '<h2><a href="https://example.com/docs">Body</a></h2>',
    ],
  ])(
    '%s 변경은 stale 한국어 fallback을 유지하고 durable 번역 worker가 새 provenance를 저장한다',
    async (_kind, changed, english) => {
      await withOfflineTranslationWorker(async modelCalls => {
        const original = '<p><a href="https://example.com/docs">본문</a></p>';
        const previous = await translatedDescription(original);
        const { product } = previous;
        await expectPublicDescription(product, original, '<p><a href="https://example.com/docs">Body</a></p>');
        const { translation } = await pendingDescriptionEdit(previous, changed, modelCalls);
        await completeDescriptionTranslation(previous, translation, changed, english, modelCalls);
      });
    },
    20_000
  );

  it.each([
    [
      'Editor start 1→5',
      '<ol><li><p>본문</p></li><li><p>조건</p></li></ol>',
      '<ol start="5"><li><p>본문</p></li><li><p>조건</p></li></ol>',
      '<ol start="5"><li><p>Body</p></li><li><p>Condition</p></li></ol>',
    ],
    [
      'reversed 추가',
      '<ol start="5"><li>본문</li><li>조건</li><li>기능</li></ol>',
      '<ol start="5" reversed><li>본문</li><li>조건</li><li>기능</li></ol>',
      '<ol start="5" reversed><li>Body</li><li>Condition</li><li>Feature</li></ol>',
    ],
    [
      'reversed 제거',
      '<ol reversed><li>본문</li><li>조건</li><li>기능</li></ol>',
      '<ol><li>본문</li><li>조건</li><li>기능</li></ol>',
      '<ol><li>Body</li><li>Condition</li><li>Feature</li></ol>',
    ],
    ['li.value 8→12', ...orderedListItemValueChange.source, orderedListItemValueChange.english],
    [
      'li.value 제거',
      '<ol start="5"><li>본문</li><li value="8">조건</li><li>기능</li></ol>',
      '<ol start="5"><li>본문</li><li>조건</li><li>기능</li></ol>',
      '<ol start="5"><li>Body</li><li>Condition</li><li>Feature</li></ol>',
    ],
  ])(
    '%s는 canonical commit의 pending job을 통해 번호와 current provenance를 복구한다',
    async (_kind, original, changed, english) => {
      await withOfflineTranslationWorker(async modelCalls => {
        const previous = await translatedDescription(original);
        const { product, firstJob, priorRows } = previous;
        expect(firstJob).toMatchObject({ status: 'completed', attemptCount: 1 });
        expect(priorRows.find(row => row?.field === 'description')).toMatchObject({
          sourceHash: `document:v1:${createHash('sha256').update(original.replace(/\r\n/g, '\n')).digest('hex')}`,
          model: 'offline-readsync',
          promptVersion: firstJob!.promptVersion,
        });
        expect((await freshness(product.id)).every(row => row.status === 'current')).toBe(true);
        const { registered, translation } = await pendingDescriptionEdit(previous, changed, modelCalls);
        await runSearch(registered.find(row => row.kind === 'search')!.id);
        expect((await SearchableProductModel.collection.findOne({ productId: product.id }))?.description).toBe(changed);
        expect(modelCalls()).toBe(2);
        await completeDescriptionTranslation(previous, translation, changed, english, modelCalls);
      });
    },
    20_000
  );

  it.each([
    [
      'if ready 조건 안 finish 들여쓰기',
      '<p>본문</p><pre><code>if ready:\n    send()\nfinish()</code></pre>',
      '<p>Body</p><pre><code>if ready:\n    send()\nfinish()</code></pre>',
      '<p>본문</p><pre><code>if ready:\n    send()\n    finish()</code></pre>',
      '<p>Body</p><pre><code>if ready:\n    send()\n    finish()</code></pre>',
    ],
    [
      'pre 단독 줄바꿈·뒤 공백',
      '<p>본문</p><pre>prepare() finish()</pre>',
      '<p>Body</p><pre>prepare() finish()</pre>',
      '<p>본문</p><pre>prepare()\nfinish()  </pre>',
      '<p>Body</p><pre>prepare()\nfinish()  </pre>',
    ],
    [
      'pre 하위 wrapper 들여쓰기·앞뒤 공백',
      '<p>본문</p><pre><span>if ready:\n    send()\n</span><div>finish()  </div></pre>',
      '<p>Body</p><pre><span>if ready:\n    send()\n</span><div>finish()  </div></pre>',
      '<p>본문</p><pre><span>if ready:\n    send()\n</span><div>    finish() </div></pre>',
      '<p>Body</p><pre><span>if ready:\n    send()\n</span><div>    finish() </div></pre>',
    ],
    [
      'inline code 연속 공백',
      meaningChanges.htmlInlineCodeSpacing.source[0],
      meaningChanges.htmlInlineCodeSpacing.english[0],
      meaningChanges.htmlInlineCodeSpacing.source[1],
      meaningChanges.htmlInlineCodeSpacing.english[1],
    ],
    [
      'Markdown fenced 조건 안 finish 들여쓰기',
      meaningChanges.fencedIndentation.source[0],
      meaningChanges.fencedIndentation.english[0],
      meaningChanges.fencedIndentation.source[1],
      meaningChanges.fencedIndentation.english[1],
    ],
    [
      'Markdown tilde fenced 줄바꿈',
      meaningChanges.tildeFenceLineBreak.source[0],
      meaningChanges.tildeFenceLineBreak.english[0],
      meaningChanges.tildeFenceLineBreak.source[1],
      meaningChanges.tildeFenceLineBreak.english[1],
    ],
    [
      'Markdown fenced 연속 공백',
      meaningChanges.fencedSpacing.source[0],
      meaningChanges.fencedSpacing.english[0],
      meaningChanges.fencedSpacing.source[1],
      meaningChanges.fencedSpacing.english[1],
    ],
    [
      'Markdown indented 조건 안 finish 들여쓰기',
      meaningChanges.indentedIndentation.source[0],
      meaningChanges.indentedIndentation.english[0],
      meaningChanges.indentedIndentation.source[1],
      meaningChanges.indentedIndentation.english[1],
    ],
    [
      'Markdown indented 줄바꿈',
      meaningChanges.indentedLineBreak.source[0],
      meaningChanges.indentedLineBreak.english[0],
      meaningChanges.indentedLineBreak.source[1],
      meaningChanges.indentedLineBreak.english[1],
    ],
    [
      'Markdown indented 연속 공백',
      meaningChanges.indentedSpacing.source[0],
      meaningChanges.indentedSpacing.english[0],
      meaningChanges.indentedSpacing.source[1],
      meaningChanges.indentedSpacing.english[1],
    ],
    [
      'Markdown 문단 병합',
      meaningChanges.paragraphMerge.source[0],
      meaningChanges.paragraphMerge.english[0],
      meaningChanges.paragraphMerge.source[1],
      meaningChanges.paragraphMerge.english[1],
    ],
    [
      'Markdown 문단 분리',
      meaningChanges.paragraphSplit.source[0],
      meaningChanges.paragraphSplit.english[0],
      meaningChanges.paragraphSplit.source[1],
      meaningChanges.paragraphSplit.english[1],
    ],
    [
      'Markdown 두 제목 병합',
      meaningChanges.headingMerge.source[0],
      meaningChanges.headingMerge.english[0],
      meaningChanges.headingMerge.source[1],
      meaningChanges.headingMerge.english[1],
    ],
    [
      'Markdown 한 제목 분리',
      meaningChanges.headingSplit.source[0],
      meaningChanges.headingSplit.english[0],
      meaningChanges.headingSplit.source[1],
      meaningChanges.headingSplit.english[1],
    ],
    [
      'Markdown 같은 제목 본문의 깊이 증가',
      meaningChanges.headingDepthIncrease.source[0],
      meaningChanges.headingDepthIncrease.english[0],
      meaningChanges.headingDepthIncrease.source[1],
      meaningChanges.headingDepthIncrease.english[1],
    ],
    [
      'Markdown 같은 제목 본문의 깊이 감소',
      meaningChanges.headingDepthDecrease.source[0],
      meaningChanges.headingDepthDecrease.english[0],
      meaningChanges.headingDepthDecrease.source[1],
      meaningChanges.headingDepthDecrease.english[1],
    ],
    [
      'Markdown 줄별 인용 marker를 본문 literal로 합침',
      meaningChanges.quoteMarkerMerge.source[0],
      meaningChanges.quoteMarkerMerge.english[0],
      meaningChanges.quoteMarkerMerge.source[1],
      meaningChanges.quoteMarkerMerge.english[1],
    ],
    [
      'Markdown 본문 literal을 줄별 인용 marker로 분리',
      meaningChanges.quoteMarkerSplit.source[0],
      meaningChanges.quoteMarkerSplit.english[0],
      meaningChanges.quoteMarkerSplit.source[1],
      meaningChanges.quoteMarkerSplit.english[1],
    ],
    [
      'Markdown 인용 추가',
      meaningChanges.quoteAddition.source[0],
      meaningChanges.quoteAddition.english[0],
      meaningChanges.quoteAddition.source[1],
      meaningChanges.quoteAddition.english[1],
    ],
    [
      'Markdown 인용 제거',
      meaningChanges.quoteRemoval.source[0],
      meaningChanges.quoteRemoval.english[0],
      meaningChanges.quoteRemoval.source[1],
      meaningChanges.quoteRemoval.english[1],
    ],
    [
      'Markdown 같은 본문의 독립 인용 경계',
      meaningChanges.separateQuoteBoundary.source[0],
      meaningChanges.separateQuoteBoundary.english[0],
      meaningChanges.separateQuoteBoundary.source[1],
      meaningChanges.separateQuoteBoundary.english[1],
    ],
    [
      'Markdown 인용 중첩 추가',
      meaningChanges.quoteNestingAddition.source[0],
      meaningChanges.quoteNestingAddition.english[0],
      meaningChanges.quoteNestingAddition.source[1],
      meaningChanges.quoteNestingAddition.english[1],
    ],
    [
      'Markdown 인용 중첩 제거',
      meaningChanges.quoteNestingRemoval.source[0],
      meaningChanges.quoteNestingRemoval.english[0],
      meaningChanges.quoteNestingRemoval.source[1],
      meaningChanges.quoteNestingRemoval.english[1],
    ],
    [
      'Markdown inline code newline을 의미 있는 연속 공백으로 변경',
      '본문 `left\nright`',
      'Body `left\nright`',
      '본문 `left  right`',
      'Body `left  right`',
    ],
    [
      'Markdown inline code newline을 tab으로 변경',
      '본문 `left\nright`',
      'Body `left\nright`',
      '본문 `left\tright`',
      'Body `left\tright`',
    ],
    [
      'Markdown inline code 공백 축소',
      meaningChanges.inlineCodeSpaceReduction.source[0],
      meaningChanges.inlineCodeSpaceReduction.english[0],
      meaningChanges.inlineCodeSpaceReduction.source[1],
      meaningChanges.inlineCodeSpaceReduction.english[1],
    ],
    [
      'Markdown inline code 공백 증가',
      meaningChanges.inlineCodeSpaceIncrease.source[0],
      meaningChanges.inlineCodeSpaceIncrease.english[0],
      meaningChanges.inlineCodeSpaceIncrease.source[1],
      meaningChanges.inlineCodeSpaceIncrease.english[1],
    ],
    [
      'Markdown 비순서 목록 평탄화',
      meaningChanges.unorderedListFlattening.source[0],
      meaningChanges.unorderedListFlattening.english[0],
      meaningChanges.unorderedListFlattening.source[1],
      meaningChanges.unorderedListFlattening.english[1],
    ],
    [
      'Markdown 비순서 목록 중첩',
      meaningChanges.unorderedListNesting.source[0],
      meaningChanges.unorderedListNesting.english[0],
      meaningChanges.unorderedListNesting.source[1],
      meaningChanges.unorderedListNesting.english[1],
    ],
    [
      'Markdown 순서 목록 평탄화',
      meaningChanges.orderedListFlattening.source[0],
      meaningChanges.orderedListFlattening.english[0],
      meaningChanges.orderedListFlattening.source[1],
      meaningChanges.orderedListFlattening.english[1],
    ],
    [
      'Markdown 순서 목록 중첩',
      meaningChanges.orderedListNesting.source[0],
      meaningChanges.orderedListNesting.english[0],
      meaningChanges.orderedListNesting.source[1],
      meaningChanges.orderedListNesting.english[1],
    ],
    [
      'Markdown 중첩 목록 종류',
      meaningChanges.nestedListKind.source[0],
      meaningChanges.nestedListKind.english[0],
      meaningChanges.nestedListKind.source[1],
      meaningChanges.nestedListKind.english[1],
    ],
    [
      'Markdown 중첩 목록 시작 번호',
      meaningChanges.nestedListStart.source[0],
      meaningChanges.nestedListStart.english[0],
      meaningChanges.nestedListStart.source[1],
      meaningChanges.nestedListStart.english[1],
    ],
    [
      'Markdown 같은 깊이의 부모 항목 이동',
      meaningChanges.listParentMovement.source[0],
      meaningChanges.listParentMovement.english[0],
      meaningChanges.listParentMovement.source[1],
      meaningChanges.listParentMovement.english[1],
    ],
    [
      'Markdown 빈 줄 없이 문단에 남은 숫자와 구두점 literal',
      meaningChanges.listParagraphLiteral.source[0],
      meaningChanges.listParagraphLiteral.english[0],
      meaningChanges.listParagraphLiteral.source[1],
      meaningChanges.listParagraphLiteral.english[1],
    ],
    [
      'Markdown hard break를 soft newline으로 변경',
      '소개  \n주의',
      'Introduction  \nWarning',
      '소개\n주의',
      'Introduction\nWarning',
    ],
    [
      'Markdown hard break 위치 이동',
      '소개  \n주의\n조건',
      'Introduction  \nWarning\nCondition',
      '소개\n주의  \n조건',
      'Introduction\nWarning  \nCondition',
    ],
    [
      'Markdown soft newline에 hard break 추가',
      '소개\n주의',
      'Introduction\nWarning',
      '소개\\\n주의',
      'Introduction\\\nWarning',
    ],
    [
      'Markdown autolink URL 경로 변경',
      meaningChanges.autolinkPath.source[0],
      meaningChanges.autolinkPath.english[0],
      meaningChanges.autolinkPath.source[1],
      meaningChanges.autolinkPath.english[1],
    ],
    [
      'Markdown autolink 이메일 주소 변경',
      meaningChanges.autolinkEmail.source[0],
      meaningChanges.autolinkEmail.english[0],
      meaningChanges.autolinkEmail.source[1],
      meaningChanges.autolinkEmail.english[1],
    ],
    [
      'Markdown autolink 같은 목적지의 표시 내용 변경',
      '주의 <help@example.com>',
      'Warning <help@example.com>',
      '주의 <mailto:help@example.com>',
      'Warning <mailto:help@example.com>',
    ],
    [
      'Markdown inline 링크 angle 목적지 경로 변경',
      '소개 [본문](<https://example.com/old>)',
      'Introduction [Body](<https://example.com/old>)',
      '소개 [본문](<https://example.com/new>)',
      'Introduction [Body](<https://example.com/new>)',
    ],
    [
      'Markdown 이미지 angle 목적지 경로 변경·같은 alt',
      '소개 ![대체](<https://example.com/old.png>)',
      'Introduction ![대체](<https://example.com/old.png>)',
      '소개 ![대체](<https://example.com/new.png>)',
      'Introduction ![대체](<https://example.com/new.png>)',
    ],
    [
      'Markdown inline 링크 angle 목적지 literal entity 변경',
      '소개 [본문](<https://example.com/a?x=1&amp;y=2>)',
      'Introduction [Body](<https://example.com/a?x=1&amp;y=2>)',
      '소개 [본문](<https://example.com/a?x=1&amp;amp;y=2>)',
      'Introduction [Body](<https://example.com/a?x=1&amp;amp;y=2>)',
    ],
    [
      'Markdown full 참조 링크 정의 목적지 변경·같은 표시 내용',
      '소개 [본문][d]\n\n[d]: <https://example.com/old>',
      'Introduction [Body][d]\n\n[d]: <https://example.com/old>',
      '소개 [본문][d]\n\n[d]: <https://example.com/new>',
      'Introduction [Body][d]\n\n[d]: <https://example.com/new>',
    ],
    [
      'Markdown full 참조 이미지 정의 목적지 변경·같은 alt',
      '소개 ![Cover][d]\n\n[d]: <https://example.com/old.png>',
      'Introduction ![Cover][d]\n\n[d]: <https://example.com/old.png>',
      '소개 ![Cover][d]\n\n[d]: <https://example.com/new.png>',
      'Introduction ![Cover][d]\n\n[d]: <https://example.com/new.png>',
    ],
    [
      'Markdown collapsed 참조 링크 정의 목적지 변경',
      '소개 [안내][]\n\n[안내]: <https://example.com/old>',
      'Introduction [Guide][안내]\n\n[안내]: <https://example.com/old>',
      '소개 [안내][]\n\n[안내]: <https://example.com/new>',
      'Introduction [Guide][안내]\n\n[안내]: <https://example.com/new>',
    ],
    [
      'Markdown shortcut 참조 이미지 정의 목적지 변경',
      '소개 ![Cover]\n\n[Cover]: <https://example.com/old.png>',
      'Introduction ![Cover]\n\n[Cover]: <https://example.com/old.png>',
      '소개 ![Cover]\n\n[Cover]: <https://example.com/new.png>',
      'Introduction ![Cover]\n\n[Cover]: <https://example.com/new.png>',
    ],
    [
      'Markdown shortcut·collapsed·full 공유 참조 목적지 변경',
      '소개 [안내] [안내][] [본문][안내]\n\n[안내]: <https://example.com/old>',
      'Introduction [Guide][안내] [Guide][안내] [Body][안내]\n\n[안내]: <https://example.com/old>',
      '소개 [안내] [안내][] [본문][안내]\n\n[안내]: <https://example.com/new>',
      'Introduction [Guide][안내] [Guide][안내] [Body][안내]\n\n[안내]: <https://example.com/new>',
    ],
    [
      'escaped code 안 Markdown 링크 목적지 변경',
      '\\<code> [안내](<https://example.com/old>) \\</code>',
      '\\<code> [Guide](<https://example.com/old>) \\</code>',
      '\\<code> [안내](<https://example.com/new>) \\</code>',
      '\\<code> [Guide](<https://example.com/new>) \\</code>',
    ],
    [
      'escaped pre 안 Markdown 이미지 목적지 변경',
      '\\<pre> 소개 ![대체](<https://example.com/old.png>) \\</pre>',
      '\\<pre> Introduction ![대체](<https://example.com/old.png>) \\</pre>',
      '\\<pre> 소개 ![대체](<https://example.com/new.png>) \\</pre>',
      '\\<pre> Introduction ![대체](<https://example.com/new.png>) \\</pre>',
    ],
    [
      '여는 code만 escape된 Markdown autolink 목적지 변경',
      '\\<code> 소개 <https://example.com/old> </code>',
      '\\<code> Introduction <https://example.com/old> </code>',
      '\\<code> 소개 <https://example.com/new> </code>',
      '\\<code> Introduction <https://example.com/new> </code>',
    ],
    [
      '실제 code와 escaped code 혼합 문서의 참조 목적지 변경',
      '<code>고정 [literal](<https://example.com/fixed>)</code>\n\n\\<code> [안내][d] \\</code>\n\n[d]: <https://example.com/old>',
      '<code>고정 [literal](<https://example.com/fixed>)</code>\n\n\\<code> [Guide][d] \\</code>\n\n[d]: <https://example.com/old>',
      '<code>고정 [literal](<https://example.com/fixed>)</code>\n\n\\<code> [안내][d] \\</code>\n\n[d]: <https://example.com/new>',
      '<code>고정 [literal](<https://example.com/fixed>)</code>\n\n\\<code> [Guide][d] \\</code>\n\n[d]: <https://example.com/new>',
    ],
  ])(
    '%s는 같은 revision에서 search·translation intent와 연결 pending job을 등록한다',
    async (_kind, original, originalEnglish, changed, english) => {
      await withOfflineTranslationWorker(async modelCalls => {
        const previous = await translatedDescription(original);
        const { product, firstJob, priorRows } = previous;
        expect(firstJob).toMatchObject({
          status: 'completed',
          attemptCount: 1,
          model: 'offline-readsync',
          promptVersion: TRANSLATION_PROMPT_VERSION,
        });
        expect(priorRows.find(row => row?.field === 'description')).toMatchObject({
          value: originalEnglish,
          sourceHash: `document:v1:${createHash('sha256').update(original.replace(/\r\n/g, '\n')).digest('hex')}`,
          model: 'offline-readsync',
          promptVersion: TRANSLATION_PROMPT_VERSION,
        });
        expect(originalEnglish).not.toBe(original);
        await expectPublicDescription(product, original, originalEnglish);
        expect((await freshness(product.id)).every(row => row.status === 'current')).toBe(true);
        const { registered, translation } = await pendingDescriptionEdit(previous, changed, modelCalls);
        await runSearch(registered.find(row => row.kind === 'search')!.id);
        expect((await SearchableProductModel.collection.findOne({ productId: product.id }))?.description).toBe(changed);
        expect(modelCalls()).toBe(2);
        await completeDescriptionTranslation(previous, translation, changed, english, modelCalls);
      });
    },
    20_000
  );

  it.each(['structure', 'tokens', 'failure'] as const)(
    '참조 번역 Reviewer %s 실패는 durable job만 실패하고 기존 영어/provenance·과거 job·stale fallback을 보존한다',
    async failure => {
      let damageReview = false;
      await withOfflineTranslationWorker(
        async modelCalls => {
          const original = '소개 [안내][] [안내] [본문][안내]\n\n[안내]: <https://example.com/old>';
          const english = 'Introduction [Guide][안내] [Guide][안내] [Body][안내]\n\n[안내]: <https://example.com/old>';
          const previous = await translatedDescription(original);
          const { product, firstId, firstJob, priorRows } = previous;
          expect(firstJob).toMatchObject({ status: 'completed', attemptCount: 1 });
          expect(priorRows.find(row => row?.field === 'description')).toMatchObject({
            value: english,
            sourceHash: `document:v1:${createHash('sha256').update(original.replace(/\r\n/g, '\n')).digest('hex')}`,
            model: 'offline-readsync',
            promptVersion: TRANSLATION_PROMPT_VERSION,
          });
          await expectPublicDescription(product, original, english);
          const changed = original.replace('/old>', '/new>');
          const { registered, translation } = await pendingDescriptionEdit(previous, changed, modelCalls);
          damageReview = true;
          await runTranslation(translation.translationJobId!, product.id);
          expect(
            (await db.select().from(translationJobs).where(eq(translationJobs.id, translation.translationJobId!)))[0]
          ).toMatchObject({ status: 'failed', attemptCount: 1 });
          expect(await storedTranslations(product.id)).toEqual(priorRows);
          expect((await db.select().from(translationJobs).where(eq(translationJobs.id, firstId)))[0]).toEqual(firstJob);
          await expectPublicDescription(product, changed, changed);
          expect((await freshness(product.id)).find(row => row.field === 'description')?.status).toBe('stale');
          // Search remains independent and still publishes the actual current Korean source.
          await runSearch(registered.find(row => row.kind === 'search')!.id);
          expect((await SearchableProductModel.collection.findOne({ productId: product.id }))?.description).toBe(
            changed
          );
        },
        encodedJson => {
          if (!damageReview) return encodedJson;
          if (failure === 'failure') throw new Error('synthetic reference review failed');
          return failure === 'structure'
            ? encodedJson.replace('Guide', '**Broken guide**')
            : encodedJson.replace(/⟦HTML_[^⟧]*⟧/, '');
        }
      );
    },
    20_000
  );

  it.each([
    [
      'pre/code의 일반 HTML 속성 순서와 presentation wrapper',
      '<pre><code>if ready:\n    send()\n    finish()</code></pre>',
      '<pre class="code" style="color:red"><code><span>if ready:\n    send()\n</span><b>    finish()</b></code></pre>',
    ],
    ['inline code 밖의 일반 텍스트 공백', ...meaningPreservingEdits.textOutsideHtmlCode.source],
    [
      'pre 밖의 일반 텍스트 줄바꿈',
      '<p>  본문\n  조건  </p><pre><code> left  right </code></pre>',
      '<p>본문 조건</p><pre><code> left  right </code></pre>',
    ],
    [
      '동일 Markdown fenced 코드 밖 본문 공백',
      '본문  조건\n\n```python\nif ready:\n    send()\nfinish()\n```',
      '본문 조건\n\n```python\nif ready:\n    send()\nfinish()\n```',
    ],
    [
      '동일 Markdown indented 코드 밖 본문 공백',
      '본문  조건\n\n    if ready:\n        send()\n    finish()',
      '본문 조건\n\n    if ready:\n        send()\n    finish()',
    ],
    [
      '일반 Markdown 본문 줄바꿈',
      ...meaningPreservingEdits.markdownSoftNewline.source,
      meaningPreservingEdits.markdownSoftNewline.english,
    ],
    [
      '같은 Markdown 문단의 표시용 공백',
      ...meaningPreservingEdits.paragraphDisplaySpacing.source,
      meaningPreservingEdits.paragraphDisplaySpacing.english,
    ],
    [
      '같은 Markdown 문단 경계',
      ...meaningPreservingEdits.paragraphBlankLines.source,
      meaningPreservingEdits.paragraphBlankLines.english,
    ],
    [
      '같은 Markdown 제목 경계·깊이·본문의 ATX/setext 표현',
      ...meaningPreservingEdits.headingAtxToSetext.source,
      meaningPreservingEdits.headingAtxToSetext.english,
    ],
    [
      '같은 Markdown 제목 경계·깊이·본문의 setext/ATX 표현',
      ...meaningPreservingEdits.headingSetextToAtx.source,
      meaningPreservingEdits.headingSetextToAtx.english,
    ],
    [
      '같은 Markdown 제목의 닫는 marker',
      ...meaningPreservingEdits.headingClosingMarkers.source,
      meaningPreservingEdits.headingClosingMarkers.english,
    ],
    [
      '같은 Markdown 제목과 일반 본문 표시용 공백',
      ...meaningPreservingEdits.headingBodySpacing.source,
      meaningPreservingEdits.headingBodySpacing.english,
    ],
    [
      '같은 Markdown 인용 본문의 soft newline',
      ...meaningPreservingEdits.quoteSoftNewline.source,
      meaningPreservingEdits.quoteSoftNewline.english,
    ],
    [
      '같은 Markdown 인용의 lazy continuation',
      ...meaningPreservingEdits.quoteLazyContinuation.source,
      meaningPreservingEdits.quoteLazyContinuation.english,
    ],
    [
      '같은 Markdown 인용 본문의 표시용 공백',
      ...meaningPreservingEdits.quoteDisplaySpacing.source,
      meaningPreservingEdits.quoteDisplaySpacing.english,
    ],
    ['같은 Markdown 인용의 marker 공백', '> 소개\n> 주의', '>소개\n>주의', '> Introduction\n> Warning'],
    [
      '같은 Markdown 인용의 marker 들여쓰기',
      ...meaningPreservingEdits.quoteMarkerIndentation.source,
      meaningPreservingEdits.quoteMarkerIndentation.english,
    ],
    [
      '같은 Markdown 중첩 인용의 marker 표현',
      ...meaningPreservingEdits.nestedQuoteMarkers.source,
      meaningPreservingEdits.nestedQuoteMarkers.english,
    ],
    [
      '같은 Markdown 인용과 inline literal 밖 공백',
      ...meaningPreservingEdits.textOutsideQuotedInlineCode.source,
      meaningPreservingEdits.textOutsideQuotedInlineCode.english,
    ],
    [
      '같은 Markdown 인용과 fenced literal의 marker',
      '> 소개\n>\n> ```\n> left  right\n> ```',
      '>소개\n>\n>```\n>left  right\n>```',
      '> Introduction\n>\n> ```\n> left  right\n> ```',
    ],
    [
      '같은 Markdown hard break의 two-space/backslash 표현',
      ...meaningPreservingEdits.hardBreakNotation.source,
      meaningPreservingEdits.hardBreakNotation.english,
    ],
    [
      '같은 Markdown 목록 항목 안 hard break 표현',
      ...meaningPreservingEdits.listHardBreakNotation.source,
      meaningPreservingEdits.listHardBreakNotation.english,
    ],
    [
      '같은 Markdown autolink 주변 표시용 공백',
      ...meaningPreservingEdits.autolinkDisplaySpacing.source,
      meaningPreservingEdits.autolinkDisplaySpacing.english,
    ],
    [
      '같은 Markdown autolink 앞 soft newline',
      ...meaningPreservingEdits.autolinkSoftNewline.source,
      meaningPreservingEdits.autolinkSoftNewline.english,
    ],
    [
      '같은 Markdown 링크 angle 목적지 주변 표시용 공백',
      '소개  [본문](<https://example.com/a>)  주의',
      '소개 [본문](<https://example.com/a>) 주의',
      'Introduction  [Body](<https://example.com/a>)  Warning',
    ],
    [
      '같은 Markdown 이미지 angle 목적지 앞 soft newline',
      ...meaningPreservingEdits.imageDestinationSoftNewline.source,
      meaningPreservingEdits.imageDestinationSoftNewline.english,
    ],
    [
      '같은 Markdown 참조 링크 정의 목적지와 주변 표시용 공백',
      '소개  [본문][d]  주의\n\n[d]: <https://example.com/a>',
      '소개 [본문][d] 주의\n\n[d]: <https://example.com/a>',
      'Introduction  [Body][d]  Warning\n\n[d]: <https://example.com/a>',
    ],
    [
      '같은 Markdown shortcut 참조 이미지 앞 soft newline',
      '소개\n![Cover]\n\n[Cover]: <https://example.com/a.png>',
      '소개 ![Cover]\n\n[Cover]: <https://example.com/a.png>',
      'Introduction\n![Cover]\n\n[Cover]: <https://example.com/a.png>',
    ],
    [
      '같은 목적지의 collapsed·shortcut·full 참조 서식',
      '소개 [안내][] [안내] [본문][안내]\n\n[안내]: <https://example.com/a>',
      '소개  [안내][]  [안내] [본문][안내]\n\n[안내]: <https://example.com/a>',
      'Introduction [Guide][안내] [Guide][안내] [Body][안내]\n\n[안내]: <https://example.com/a>',
    ],
    [
      '같은 escaped code 안 링크 목적지의 표시용 공백',
      ...meaningPreservingEdits.escapedCodeLinkSpacing.source,
      meaningPreservingEdits.escapedCodeLinkSpacing.english,
    ],
    [
      '같은 escaped pre 안 이미지 목적지 앞 soft newline',
      '\\<pre> 소개\n![대체](<https://example.com/a.png>) \\</pre>',
      '\\<pre> 소개 ![대체](<https://example.com/a.png>) \\</pre>',
      '\\<pre> Introduction\n![대체](<https://example.com/a.png>) \\</pre>',
    ],
    [
      '같은 escaped code 안 참조 목적지 앞 soft newline',
      ...meaningPreservingEdits.escapedCodeReferenceSoftNewline.source,
      meaningPreservingEdits.escapedCodeReferenceSoftNewline.english,
    ],
    ['같은 Markdown inline literal 안의 LF 표현', '본문 `left\nright`', '본문 `left right`', 'Body `left\nright`'],
    [
      '같은 Markdown inline literal 안의 CRLF 표현',
      '본문 `left\r\nright`',
      '본문 `left right`',
      'Body `left\r\nright`',
    ],
    [
      '같은 Markdown 인용 inline literal 안의 LF 표현',
      ...meaningPreservingEdits.quotedInlineCodeLineEnding.source,
      meaningPreservingEdits.quotedInlineCodeLineEnding.english,
    ],
    [
      '같은 Markdown inline literal 밖의 soft newline',
      ...meaningPreservingEdits.textBeforeInlineCodeNewline.source,
      meaningPreservingEdits.textBeforeInlineCodeNewline.english,
    ],
    [
      '같은 Markdown inline literal 밖의 표시용 공백',
      ...meaningPreservingEdits.textOutsideInlineCodeSpacing.source,
      meaningPreservingEdits.textOutsideInlineCodeSpacing.english,
    ],
    [
      '같은 Markdown inline literal의 delimiter',
      ...meaningPreservingEdits.inlineCodeDelimiters.source,
      meaningPreservingEdits.inlineCodeDelimiters.english,
    ],
    [
      '같은 Markdown 목록 계층의 비순서 marker',
      ...meaningPreservingEdits.unorderedListMarkers.source,
      meaningPreservingEdits.unorderedListMarkers.english,
    ],
    [
      '같은 Markdown 목록 계층의 들여쓰기·본문 공백',
      '- 소개  조건\n  - 주의',
      ' - 소개 조건\n    - 주의',
      '- Introduction  Condition\n  - Warning',
    ],
    [
      '같은 Markdown 순서 목록 계층·번호의 delimiter',
      ...meaningPreservingEdits.nestedOrderedListDelimiters.source,
      meaningPreservingEdits.nestedOrderedListDelimiters.english,
    ],
    [
      '같은 Markdown 목록 항목 사이 빈 줄',
      ...meaningPreservingEdits.listItemBlankLines.source,
      meaningPreservingEdits.listItemBlankLines.english,
    ],
    [
      '같은 Markdown 목록 계층과 inline literal',
      ...meaningPreservingEdits.listInlineCodeDelimiters.source,
      meaningPreservingEdits.listInlineCodeDelimiters.english,
    ],
  ])(
    '%s는 search-only이며 코드 의미 공백과 기존 영어·provenance를 보존한다',
    async (_kind, original, changed, originalEnglish?: string) => {
      await withOfflineTranslationWorker(async modelCalls => {
        const previous = await translatedDescription(original);
        const { product, firstId, priorRows, priorJobs } = previous;
        if (originalEnglish !== undefined) {
          expect(priorRows.find(row => row?.field === 'description')).toMatchObject({
            value: originalEnglish,
            sourceHash: `document:v1:${createHash('sha256').update(original.replace(/\r\n/g, '\n')).digest('hex')}`,
            model: 'offline-readsync',
            promptVersion: TRANSLATION_PROMPT_VERSION,
          });
          expect(priorJobs).toEqual([expect.objectContaining({ id: firstId, status: 'completed', attemptCount: 1 })]);
          await expectPublicDescription(product, original, originalEnglish);
          expect((await freshness(product.id)).every(row => row.status === 'current')).toBe(true);
        }
        await searchOnlyDescriptionEdit(previous, changed, modelCalls);
      });
    },
    20_000
  );

  it.each([
    ['기본 start 1 추가', ...meaningPreservingEdits.defaultOrderedListStart.source],
    ['기본 start 1 제거', '<ol start="1"><li>본문</li><li>조건</li></ol>', '<ol><li>본문</li><li>조건</li></ol>'],
    [
      '속성 순서·서식 wrapper',
      '<ol class="before" start="5"><li>본문</li><li value="8">조건</li></ol>',
      '<ol start="5" style="color:red" class="after"><li><strong>본문</strong></li><li class="item" value="8"><span>조건</span></li></ol>',
    ],
  ])(
    '%s는 search-only이며 기존 영어와 job을 보존하고 한국어 fallback/stale로 남는다',
    async (_kind, original, changed) => {
      await withOfflineTranslationWorker(async modelCalls => {
        const previous = await translatedDescription(original);
        await searchOnlyDescriptionEdit(previous, changed, modelCalls);
      });
    },
    20_000
  );

  it('legacy null provenance는 공개 단건·배치 한국어 fallback이며 missing과 원문 없는 optional을 구분한다', async () => {
    await withOfflineTranslationWorker(async modelCalls => {
      const product = await seed();
      await db.update(products).set({ summary: '' }).where(eq(products.id, product.id));
      const [feature] = await db
        .insert(productFeatures)
        .values({
          productId: product.id,
          name: '기능',
          summary: null,
          emoji: '🔎',
        })
        .returning();
      await db.insert(translations).values([
        {
          entityType: 'Product',
          entityId: product.id,
          locale: 'en',
          field: 'description',
          value: '<p>Legacy body</p>',
          sourceHash: null,
        },
        {
          entityType: 'ProductFeature',
          entityId: feature!.id,
          locale: 'en',
          field: 'name',
          value: 'Legacy feature',
          sourceHash: null,
        },
      ]);
      const priorRows = await storedTranslations(product.id);
      const formatted = '<p class="display"><strong>본문</strong></p>';
      const edited = await mutate(print(EditProductOnEditProductDescriptionDocument), {
        slug: product.slug,
        input: { description: formatted },
      });
      expect(edited.errors).toBeUndefined();
      await expectPublicDescription(product, formatted, formatted);
      const result = await freshness(product.id);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ entityType: 'Product', field: 'name', status: 'missing' }),
          expect.objectContaining({ entityType: 'Product', field: 'summary', status: 'current' }),
          expect.objectContaining({ entityType: 'Product', field: 'description', status: 'stale' }),
          expect.objectContaining({ entityType: 'ProductFeature', field: 'name', status: 'stale' }),
          expect.objectContaining({ entityType: 'ProductFeature', field: 'summary', status: 'current' }),
        ])
      );
      const reads = new TranslationService(new PostgresqlTranslationRepository(db as never));
      expect(
        await reads.getTranslation({
          entityType: 'ProductFeature',
          entityId: feature!.id,
          locale: 'en',
          field: 'name',
          koreanValue: '기능',
        })
      ).toBe('기능');
      expect(
        (
          await reads.getTranslations({
            entityType: 'ProductFeature',
            locale: 'en',
            entries: [{ entityId: feature!.id, field: 'name', koreanValue: '기능' }],
          })
        ).get(`${feature!.id}:name`)
      ).toBe('기능');
      const publicFeature = await mutate(
        'query($slug:String!){productBySlug(slug:$slug,locale:"en"){name summary features{name summary}} recentProducts(first:10,locale:"en"){id name summary}}',
        { slug: product.slug }
      );
      expect(publicFeature.errors).toBeUndefined();
      expect(publicFeature.data.productBySlug).toEqual({
        name: '원래 이름',
        summary: '',
        features: [{ name: '기능', summary: null }],
      });
      expect(publicFeature.data.recentProducts.find((row: { id: string }) => row.id === product.id)).toMatchObject({
        name: '원래 이름',
        summary: '',
      });
      expect(await storedTranslations(product.id)).toEqual(priorRows);
      expect((await intents(product.id)).map(row => row.kind)).toEqual(['search']);
      expect(await db.select().from(translationJobs).where(eq(translationJobs.entityId, product.id))).toEqual([]);
      expect(modelCalls()).toBe(0);
    });
  }, 20_000);

  it('publish와 Category 실제 변경만 revision을 증가시키고 category bookkeeping은 무시한다', async () => {
    const product = await seed();
    await db.update(products).set({ publishedAt: null }).where(eq(products.id, product.id));
    const [category] = await db
      .insert(categories)
      .values({
        slug: randomUUID(),
        labelKo: '기존 분류',
        labelEn: 'Previous category',
      })
      .returning();
    await repository.updateById(product.id, value => {
      value.update({ categoryIds: [category!.id] });
      return value;
    });
    expect(await intents(product.id)).toHaveLength(0);
    await repository.updateById(product.id, value => {
      value.publish();
      return value;
    });
    expect((await intents(product.id)).map(row => row.kind).sort()).toEqual(['search', 'translation']);
    const categoryRepository = new PostgresqlCategoryRepository(db as never);
    const before = (await db.select().from(products).where(eq(products.id, product.id)))[0]!.contentRevision;
    await categoryRepository.updateById(category!.id, value => value);
    expect((await db.select().from(products).where(eq(products.id, product.id)))[0]!.contentRevision).toBe(before);
    await categoryRepository.updateById(category!.id, value => {
      value.labelKo = '변경 분류';
      return value;
    });
    const rows = await intents(product.id);
    expect(rows.filter(row => row.kind === 'translation')).toHaveLength(1);
    expect(rows.find(row => row.kind === 'translation')?.status).toBe('pending');
    expect(rows.filter(row => row.kind === 'search')).toHaveLength(2);
    expect((await db.select().from(products).where(eq(products.id, product.id)))[0]!.contentRevision).toBe(
      before + BigInt(1)
    );
  });

  it('intent/job 기록 실패는 canonical write/revision과 함께 rollback된다', async () => {
    const product = await seed();
    const registrar = Container.get(ProductContentSyncRegistrarToken);
    Container.set(ProductContentSyncRegistrarToken, {
      register: async (
        tx: Parameters<typeof registerProductContentSync>[0],
        input: Parameters<typeof registerProductContentSync>[1]
      ) => {
        await registerProductContentSync(tx, input);
        throw new Error('forced intent failure');
      },
    });
    try {
      await expect(
        repository.updateById(product.id, value => {
          value.update({ summary: '실패 값' });
          return value;
        })
      ).rejects.toThrow('forced intent failure');
      expect((await db.select().from(products).where(eq(products.id, product.id)))[0]).toMatchObject({
        summary: '요약',
        contentRevision: BigInt(0),
      });
      expect(await intents(product.id)).toHaveLength(0);
      expect(await db.select().from(translationJobs).where(eq(translationJobs.entityId, product.id))).toHaveLength(0);
    } finally {
      Container.set(ProductContentSyncRegistrarToken, registrar);
    }
  });

  it('동시 동일 canonical 변경과 동일 revision 수동 예약은 intent/job identity를 중복하지 않는다', async () => {
    const product = await seed();
    await Promise.all(
      [1, 2].map(() =>
        repository.updateById(product.id, value => {
          value.update({ name: '동일 요청 이름' });
          return value;
        })
      )
    );
    const rows = await intents(product.id);
    expect(rows).toHaveLength(2);
    expect(rows.every(row => row.sourceRevision === BigInt(1))).toBe(true);
    expect(await db.select().from(translationJobs).where(eq(translationJobs.entityId, product.id))).toHaveLength(1);
    const requests = await Promise.all([sync.requestSearch(product.slug), sync.requestSearch(product.slug)]);
    expect(requests[0]!.intentId).toBe(requests[1]!.intentId);
    expect(await intents(product.id)).toHaveLength(2);
  });

  it('translation만 실패해도 search와 canonical commit은 남고 tick이 누락 전송과 실패를 재발견한다', async () => {
    const product = await seed();
    await repository.updateById(product.id, value => {
      value.update({ summary: '별도 실패 요약' });
      return value;
    });
    const rows = await intents(product.id);
    const translation = rows.find(row => row.kind === 'translation')!;
    const searchIntent = rows.find(row => row.kind === 'search')!;
    failTranslation = true;
    await runTranslation(translation.translationJobId!, product.id);
    failTranslation = false;
    await runSearch(searchIntent.id);
    expect(await sync.status(searchIntent.id)).toMatchObject({
      status: 'completed',
    });
    expect(
      (await db.select().from(translationJobs).where(eq(translationJobs.id, translation.translationJobId!)))[0]?.status
    ).toBe('failed');
    const send = vi.spyOn(queue, 'sendIntent').mockRejectedValue(new Error('queue unavailable'));
    try {
      const request = await sync.requestSearch(product.slug);
      expect(request.status).toBe('pending');
      await db
        .update(productContentSyncIntents)
        .set({ retryAfter: new Date(0) })
        .where(eq(productContentSyncIntents.id, translation.id));
      await recoveryTick({}, context, () => {});
      expect(await sync.status(request.intentId)).toMatchObject({
        status: 'pending',
        error: 'CONTENT_SYNC_QUEUE_FAILED',
      });
      // 자동 tick은 failed job을 같은 ID로 pending 복귀시키지 않는다(수동 retry만 새 job을 만든다).
      expect(
        (await db.select().from(translationJobs).where(eq(translationJobs.id, translation.translationJobId!)))[0]
          ?.status
      ).toBe('failed');
      send.mockResolvedValue(true);
      await db
        .update(productContentSyncIntents)
        .set({ dispatchAfter: new Date(0) })
        .where(eq(productContentSyncIntents.id, request.intentId));
      await recoveryTick({}, context, () => {});
      expect(send).toHaveBeenCalledWith(request.intentId);
      expect(await sync.status(request.intentId)).not.toMatchObject({
        status: 'completed',
      });
      // 수동 retry는 새 logical job을 만들고 과거 job은 그대로 보존된다.
      // 수동 retry는 같은 최신 intent의 연결 포인터만 새 job으로 옮긴다.
      const translationService = Container.get(TranslationJobService);
      const retry = await translationService.retryProductTranslationJob(translation.translationJobId!);
      expect(retry.id).not.toBe(translation.translationJobId);
      expect(retry.retryOfJobId).toBe(translation.translationJobId);
      await runTranslation(retry.id, product.id);
      expect((await sync.latestStatus(product.slug)).translationJobId).toBe(retry.id);
      await runSearch(request.intentId);
      expect((await db.select().from(translationJobs).where(eq(translationJobs.id, retry.id)))[0]?.status).toBe(
        'completed'
      );
      expect(
        (await db.select().from(translationJobs).where(eq(translationJobs.id, translation.translationJobId!)))[0]
          ?.status
      ).toBe('failed');
    } finally {
      send.mockRestore();
    }
  });

  it.each(['completed', 'superseded'] as const)(
    '검색 snapshot: %s 재전달은 원문 잠금과 근거 조회 없이 종료한다',
    async terminal => {
      const product = await seed();
      const request = await sync.requestSearch(product.slug);
      await db
        .update(productContentSyncIntents)
        .set({ status: terminal })
        .where(eq(productContentSyncIntents.id, request.intentId));
      const queries: string[] = [];
      const index = vi.fn().mockResolvedValue(true);
      const worker = new PostgresqlProductContentSync(
        drizzle(connection, { logger: { logQuery: query => queries.push(query) } }) as never,
        { index } as never,
        queue
      );
      await worker.executeSearch(request.intentId);
      expect(index).not.toHaveBeenCalled();
      expect(queries.filter(query => /from "products"|pg_advisory|for update/i.test(query))).toEqual([]);
      expect(queries.filter(query => /(?:from|join) "(?!product_content_sync_intents")/.test(query))).toEqual([]);
      expect(await sync.status(request.intentId)).toMatchObject({ status: terminal, attemptCount: 0 });
    }
  );

  it.each(['<p>검색 본문</p>', null])(
    '검색 snapshot: 필요한 상품과 태그만 읽고 본문 %s와 revision을 보존한다',
    async description => {
      const product = await seed();
      await db
        .update(products)
        .set({
          description,
          categoryIds: ['category-primary', 'category-secondary'],
          contentRevision: 9007199254740993n,
        })
        .where(eq(products.id, product.id));
      const [tag] = await db.insert(tags).values({ name: randomUUID(), type: 'KEYWORD' }).returning();
      await db.insert(productTags).values({ productId: product.id, tagId: tag!.id });
      const request = await sync.requestSearch(product.slug);
      const queries: string[] = [];
      const index = vi.fn().mockResolvedValue(true);
      const worker = new PostgresqlProductContentSync(
        drizzle(connection, { logger: { logQuery: query => queries.push(query) } }) as never,
        { index } as never,
        queue
      );
      await worker.executeSearch(request.intentId);
      expect(index).toHaveBeenCalledExactlyOnceWith(
        product.id,
        expect.objectContaining({
          id: product.id,
          name: '원래 이름',
          slug: product.slug,
          summary: '요약',
          description: description ?? '',
          tags: [tag!.name],
          category: 'category-primary',
          createdAt: product.createdAt,
          publishedAt: product.publishedAt,
          sourceRevision: '9007199254740993',
        })
      );
      expect(
        queries.filter(query =>
          /(?:from|join) "(?:categories|product_features|product_links|product_screenshots|product_flows|product_flow_steps|product_research_jobs)"/.test(
            query
          )
        )
      ).toEqual([]);
      expect(queries.findIndex(query => /from "products".*for update/i.test(query))).toBeLessThan(
        queries.findIndex(query => /from "product_content_sync_intents".*for update/i.test(query))
      );
      expect(await sync.status(request.intentId)).toMatchObject({ status: 'completed', attemptCount: 1 });
    }
  );

  it('검색 snapshot: Product 잠금 대기 중 편집이 끝나면 intent를 다시 확인한다', async () => {
    const product = await seed();
    const request = await sync.requestSearch(product.slug);
    const index = vi.fn().mockResolvedValue(true);
    let reachedProduct!: () => void;
    const locking = new Promise<void>(resolve => {
      reachedProduct = resolve;
    });
    const queries: string[] = [];
    const worker = new PostgresqlProductContentSync(
      drizzle(connection, {
        logger: {
          logQuery(query) {
            queries.push(query);
            if (/from "products".*for update/i.test(query)) reachedProduct();
          },
        },
      }) as never,
      { index } as never,
      queue
    );
    let running: Promise<void> | undefined;
    try {
      await db.transaction(async tx => {
        const finish = await beginProductContentWrite(tx as never, product.id);
        running = worker.executeSearch(request.intentId);
        await locking;
        await tx.update(products).set({ name: '잠금 중 저장한 최신 이름' }).where(eq(products.id, product.id));
        await finish();
      });
    } finally {
      await running;
    }
    expect(index).not.toHaveBeenCalled();
    expect(queries.filter(query => /from "product_tags"/.test(query))).toEqual([]);
    expect(await sync.status(request.intentId)).toMatchObject({ status: 'superseded', attemptCount: 0 });
    const latest = (await intents(product.id)).find(row => row.kind === 'search' && row.sourceRevision === 1n)!;
    await worker.executeSearch(latest.id);
    expect(index).toHaveBeenCalledExactlyOnceWith(
      product.id,
      expect.objectContaining({
        name: '잠금 중 저장한 최신 이름',
        sourceRevision: '1',
      })
    );
  });

  it('검색 snapshot: 중복 worker를 막고 늦게 끝난 이전 revision은 최신 색인을 덮지 않는다', async () => {
    const product = await seed();
    const request = await sync.requestSearch(product.slug);
    let started!: () => void;
    const indexing = new Promise<void>(resolve => {
      started = resolve;
    });
    let release!: () => void;
    const paused = new Promise<void>(resolve => {
      release = resolve;
    });
    const index = vi.fn(async (id: string, payload: SearchableProduct) => {
      if (payload.sourceRevision === '0') {
        started();
        await paused;
      }
      return search.index(id, payload);
    });
    const worker = new PostgresqlProductContentSync(db as never, { index } as never, queue);
    const oldWorker = worker.executeSearch(request.intentId);
    try {
      await indexing;
      await worker.executeSearch(request.intentId);
      expect(index).toHaveBeenCalledTimes(1);
      expect(await sync.status(request.intentId)).toMatchObject({ status: 'in_progress', attemptCount: 1 });
      await repository.updateById(product.id, value => {
        value.update({ name: '새 revision의 이름' });
        return value;
      });
      const latest = (await intents(product.id)).find(row => row.kind === 'search' && row.sourceRevision === 1n)!;
      await worker.executeSearch(latest.id);
      release();
      await oldWorker;
      expect(index).toHaveBeenCalledTimes(2);
      expect(await sync.status(request.intentId)).toMatchObject({ status: 'superseded' });
      expect(await sync.status(latest.id)).toMatchObject({ status: 'completed', attemptCount: 1 });
      const projection = await SearchableProductModel.collection.findOne({ productId: product.id });
      expect(projection?.name).toBe('새 revision의 이름');
      expect(projection?.sourceRevision.toString()).toBe('1');
    } finally {
      release();
      await oldWorker;
    }
  });

  it('duplicate pending reservations retain backoff and recovery never terminates completed or superseded intents', async () => {
    const product = await seed();
    const request = await sync.requestSearch(product.slug);
    const due = new Date(Date.now() + 120_000);
    await db
      .update(productContentSyncIntents)
      .set({ attemptCount: 2, retryAfter: due, dispatchAfter: due })
      .where(eq(productContentSyncIntents.id, request.intentId));
    await sync.requestSearch(product.slug);
    const [pending] = await db
      .select()
      .from(productContentSyncIntents)
      .where(eq(productContentSyncIntents.id, request.intentId));
    expect(pending?.attemptCount).toBe(2);
    expect(pending?.retryAfter).toEqual(due);
    expect(pending?.dispatchAfter).toEqual(due);
    for (const terminal of ['completed', 'superseded'] as const) {
      await db
        .update(productContentSyncIntents)
        .set({ status: terminal, attemptCount: 3, leaseUntil: null })
        .where(eq(productContentSyncIntents.id, request.intentId));
      await recoveryTick({}, context, () => {});
      await sync.executeSearch(request.intentId);
      expect(await sync.status(request.intentId)).toMatchObject({ status: terminal, attemptCount: 3 });
    }
  });

  it.each(['expired', 'legacy-null'] as const)(
    'last claimed search %s converges through tick and fences its late result',
    async lease => {
      const product = await seed();
      const request = await sync.requestSearch(product.slug);
      const index = vi.spyOn(search, 'index');
      index.mockRejectedValueOnce(new Error('first failure')).mockRejectedValueOnce(new Error('second failure'));
      for (let attempt = 0; attempt < 2; attempt++) {
        await sync.executeSearch(request.intentId);
        expect(await sync.status(request.intentId)).toMatchObject({ status: 'failed', attemptCount: attempt + 1 });
        await db
          .update(productContentSyncIntents)
          .set({ retryAfter: new Date(0) })
          .where(eq(productContentSyncIntents.id, request.intentId));
      }
      let release!: (value: boolean) => void;
      let started!: () => void;
      const claimed = new Promise<void>(resolve => {
        started = resolve;
      });
      index.mockImplementationOnce(async () => {
        started();
        return new Promise<boolean>(resolve => {
          release = resolve;
        });
      });
      const oldWorker = sync.executeSearch(request.intentId);
      await claimed;
      try {
        const [active] = await db
          .select()
          .from(productContentSyncIntents)
          .where(eq(productContentSyncIntents.id, request.intentId));
        expect(active).toMatchObject({ status: 'in_progress', attemptCount: 3 });
        await recoveryTick({}, context, () => {});
        expect(await sync.status(request.intentId)).toMatchObject({ status: 'in_progress', attemptCount: 3 });
        await sync.requestSearch(product.slug);
        const [duplicate] = await db
          .select()
          .from(productContentSyncIntents)
          .where(eq(productContentSyncIntents.id, request.intentId));
        expect(duplicate?.leaseToken).toBe(active?.leaseToken);
        await db
          .update(productContentSyncIntents)
          .set({ leaseUntil: lease === 'expired' ? new Date(0) : null })
          .where(eq(productContentSyncIntents.id, request.intentId));
        await recoveryTick({}, context, () => {});
        expect(await sync.status(request.intentId)).toMatchObject({
          status: 'failed',
          attemptCount: 3,
          error: 'SEARCH_ATTEMPTS_EXHAUSTED',
        });
        const retry = await sync.requestSearch(product.slug);
        expect(retry).toMatchObject({ intentId: request.intentId, status: 'pending', attemptCount: 0 });
        await sync.executeSearch(retry.intentId);
        expect(await sync.status(retry.intentId)).toMatchObject({ status: 'completed', attemptCount: 1 });
        release(false);
        await oldWorker;
        expect(await sync.status(retry.intentId)).toMatchObject({ status: 'completed', attemptCount: 1 });
        const projection = await SearchableProductModel.collection.findOne({ productId: product.id });
        expect(projection?.name).toBe('원래 이름');
      } finally {
        release(true);
        await oldWorker;
        index.mockRestore();
      }
    },
    15_000
  );

  it('four completed manual runs reuse revision identity with a fresh budget and preserve votes', async () => {
    const product = await seed();
    let identity: string | undefined;
    for (let run = 0; run < 4; run++) {
      const request = await sync.requestSearch(product.slug);
      identity ??= request.intentId;
      expect(request).toMatchObject({ intentId: identity, sourceRevision: '0', status: 'pending', attemptCount: 0 });
      const [pending] = await db
        .select()
        .from(productContentSyncIntents)
        .where(eq(productContentSyncIntents.id, identity));
      expect(pending?.leaseToken).toBeNull();
      expect(pending?.leaseUntil).toBeNull();
      expect(pending!.retryAfter.getTime()).toBeLessThanOrEqual(Date.now());
      expect(pending!.dispatchAfter.getTime()).toBeLessThanOrEqual(Date.now());
      await sync.executeSearch(request.intentId);
      expect(await sync.status(identity)).toMatchObject({ status: 'completed', attemptCount: 1 });
      if (run === 0)
        await SearchableProductModel.collection.updateOne({ productId: product.id }, { $set: { votes: 17 } });
    }
    expect((await intents(product.id)).map(row => row.kind)).toEqual(['search']);
    const projection = await SearchableProductModel.collection.findOne(
      { productId: product.id },
      { promoteLongs: false }
    );
    expect(projection?.votes).toBe(17);
    expect(projection?.sourceRevision.toString()).toBe('0');
  });

  it('3회 소진한 search intent는 자동 재발견되지 않고 수동 retry만 새 시도로 복구한다', async () => {
    const product = await seed();
    const request = await sync.requestSearch(product.slug);
    // 3회 실패를 시뮬레이션한다.
    await db
      .update(productContentSyncIntents)
      .set({ status: 'failed', attemptCount: 3, retryAfter: new Date(0), dispatchAfter: new Date(0) })
      .where(eq(productContentSyncIntents.id, request.intentId));
    const send = vi.spyOn(queue, 'sendIntent').mockResolvedValue(true);
    try {
      await recoveryTick({}, context, () => {});
      // 상한을 채운 failed intent는 자동 재송신되지 않는다.
      expect(send).not.toHaveBeenCalled();
      expect(await sync.status(request.intentId)).toMatchObject({ status: 'failed', attemptCount: 3 });

      // 상한 미만의 failed intent는 재발견된다.
      await db
        .update(productContentSyncIntents)
        .set({ attemptCount: 1 })
        .where(eq(productContentSyncIntents.id, request.intentId));
      await recoveryTick({}, context, () => {});
      expect(send).toHaveBeenCalledWith(request.intentId);

      // 수동 retry는 상한을 채운 failed intent를 새 시도(시도 0)로 복구한다.
      await db
        .update(productContentSyncIntents)
        .set({ status: 'failed', attemptCount: 3, retryAfter: new Date(0), dispatchAfter: new Date(0) })
        .where(eq(productContentSyncIntents.id, request.intentId));
      await sync.retry(product.slug);
      expect(await sync.status(request.intentId)).toMatchObject({ status: 'pending', attemptCount: 0 });
    } finally {
      send.mockRestore();
    }
  });

  it('global revision과 별개인 각 kind 최신 상태를 표시하고 failed intent만 원자 재예약한다', async () => {
    const product = await seed();
    await db.update(products).set({ contentRevision: 5n }).where(eq(products.id, product.id));
    const [oldJob] = await db
      .insert(translationJobs)
      .values({
        entityType: 'Product',
        entityId: product.id,
        fields: ['name', 'summary', 'description', 'features'],
        status: 'failed',
        error: 'PROVIDER_FAILED',
      })
      .returning();
    const [translation] = await db
      .insert(productContentSyncIntents)
      .values({
        productId: product.id,
        sourceRevision: 4n,
        kind: 'translation',
        status: 'failed',
        translationJobId: oldJob!.id,
      })
      .returning();
    const [searchIntent] = await db
      .insert(productContentSyncIntents)
      .values({ productId: product.id, sourceRevision: 5n, kind: 'search', status: 'completed' })
      .returning();
    await db
      .insert(productContentSyncIntents)
      .values({ productId: product.id, sourceRevision: 2n, kind: 'search', status: 'failed' });
    const before = await sync.latestStatus(product.slug);
    expect(before).toMatchObject({
      sourceRevision: '5',
      searchStatus: 'completed',
      translationDispatchStatus: 'registered',
      translationJobStatus: 'failed',
      translationIntent: { sourceRevision: '4' },
    });
    const results = await Promise.allSettled([sync.retry(product.slug), sync.retry(product.slug)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const after = await sync.latestStatus(product.slug);
    expect(after.translationJobId).not.toBe(oldJob!.id);
    expect(after).toMatchObject({
      searchStatus: 'completed',
      translationJobStatus: 'pending',
      translationIntent: { intentId: translation!.id, sourceRevision: '4', status: 'pending' },
    });
    expect((await db.select().from(translationJobs).where(eq(translationJobs.id, oldJob!.id)))[0]!.status).toBe(
      'failed'
    );
    expect(
      (await db.select().from(productContentSyncIntents).where(eq(productContentSyncIntents.id, searchIntent!.id)))[0]!
        .status
    ).toBe('completed');
    expect((await intents(product.id)).find(row => row.kind === 'search' && row.sourceRevision === 2n)!.status).toBe(
      'failed'
    );
    await runTranslation(after.translationJobId!, product.id);
    expect((await sync.latestStatus(product.slug)).translationJobStatus).toBe('completed');
    await expect(sync.retry(product.slug)).rejects.toMatchObject({
      extensions: { code: 'CONTENT_SYNC_NOT_RETRYABLE' },
    });
  });

  async function entityJobRows(entityId: string) {
    return db.select().from(translationJobs).where(eq(translationJobs.entityId, entityId));
  }

  it('retry commit 전에는 새 job과 포인터가 비가시이고 경쟁한 새 canonical intent의 포인터를 빼앗지 않는다', async () => {
    const product = await seed();
    const [failedJob] = await db
      .insert(translationJobs)
      .values({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        fields: ['name', 'summary', 'description', 'features'],
        status: 'failed',
        error: 'PROVIDER_FAILED',
      })
      .returning();
    const [translation] = await db
      .insert(productContentSyncIntents)
      .values({
        productId: product.id,
        sourceRevision: 4n,
        kind: 'translation',
        status: 'failed',
        translationJobId: failedJob!.id,
      })
      .returning();
    // 전용 session이 advisory lock을 보유해 포인터 갱신 trigger가 그 지점에서 멈춘다.
    const gate = postgres(databaseUrl!, { prepare: false, max: 1 });
    const retryWriterName = `content-sync-retry-${randomUUID()}`;
    const retryConnection = postgres(databaseUrl!, {
      prepare: false,
      max: 2,
      connection: { application_name: retryWriterName },
    });
    const retryDb = drizzle(retryConnection);
    await connection.unsafe('DROP TRIGGER IF EXISTS gate_retry_pointer ON product_content_sync_intents');
    await connection.unsafe('DROP FUNCTION IF EXISTS gate_retry_pointer()');
    await connection.unsafe(
      `CREATE FUNCTION gate_retry_pointer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_lock(872004); PERFORM pg_advisory_unlock(872004); RETURN NEW; END $$`
    );
    await connection.unsafe(
      `CREATE TRIGGER gate_retry_pointer BEFORE UPDATE ON product_content_sync_intents FOR EACH ROW WHEN (NEW.id = '${translation!.id}') EXECUTE FUNCTION gate_retry_pointer()`
    );
    await gate`select pg_advisory_lock(872004)`;
    const retryService = new TranslationJobService(
      new GetProduct(repository),
      provider,
      new PostgresqlTranslationJobRepository(retryDb as never),
      new PostgresqlTranslationSourceStore(retryDb as never),
      new TranslationQueueService()
    );
    const pending = retryService.retryProductTranslationJob(failedJob!.id);
    void pending.catch(() => undefined); // 실패 판정은 아래 await pending이 검사한다.
    try {
      try {
        let blocked = false;
        const deadline = Date.now() + 5000;
        while (!blocked && Date.now() < deadline) {
          const rows =
            await connection`select 1 from pg_stat_activity where application_name = ${retryWriterName} and wait_event_type = 'Lock'`;
          blocked = rows.length > 0;
        }
        if (!blocked) throw new Error('Translation retry writer did not wait for the gated pointer update');
        // commit 전: 다른 connection에서는 새 retry job도 포인터 갱신도 보이지 않는다.
        expect(await entityJobRows(product.id)).toHaveLength(1);
        expect((await intents(product.id)).map(row => row.translationJobId)).toEqual([failedJob!.id]);
      } finally {
        await gate`select pg_advisory_unlock(872004)`;
      }
      const retry = (await pending) as { id: string; retryOfJobId: string | null; status: string };
      expect(retry.id).not.toBe(failedJob!.id);
      expect(retry.retryOfJobId).toBe(failedJob!.id);
      expect((await entityJobRows(product.id)).map(job => job.id).sort()).toEqual([failedJob!.id, retry.id].sort());
      expect((await intents(product.id))[0]).toMatchObject({ translationJobId: retry.id, status: 'pending' });
      // 경쟁한 새 동일 kind canonical intent가 최신이면 이 retry는 최신 포인터를 빼앗지 않는다.
      await db.update(products).set({ contentRevision: 4n }).where(eq(products.id, product.id));
      await repository.updateById(product.id, value => {
        value.update({ summary: '경쟁 요청 요약' });
        return value;
      });
      const [competing] = (await intents(product.id)).filter(
        row => row.kind === 'translation' && row.status === 'pending'
      );
      expect(competing?.translationJobId).toBeDefined();
      const loser = await retryService.retryProductTranslationJob(failedJob!.id);
      expect(loser.retryOfJobId).toBe(failedJob!.id);
      expect((await intents(product.id)).find(row => row.id === competing!.id)?.translationJobId).toBe(
        competing!.translationJobId
      );
      expect((await intents(product.id)).find(row => row.id === translation!.id)?.translationJobId).toBe(retry.id);
      // 이전 retry의 job과 연결은 새 canonical intent에 의해 대체될 뿐 최신 포인터를 유지하지 않는다.
      expect((await entityJobRows(product.id)).find(job => job.id === retry.id)?.status).toBe('superseded');
    } finally {
      await connection.unsafe('DROP TRIGGER gate_retry_pointer ON product_content_sync_intents');
      await connection.unsafe('DROP FUNCTION gate_retry_pointer()');
      await retryConnection.end({ timeout: 5 });
      await gate.end({ timeout: 5 });
    }
  }, 15_000);

  it.each(['Product', 'Magazine'] as const)(
    '%s job과 intent Product의 identity 불일치는 retry 전체를 rollback한다',
    async entityType => {
      const owner = await seed();
      const source = await seed();
      const [job] = await db
        .insert(translationJobs)
        .values({
          entityType,
          entityId: source.id,
          fields: entityType === 'Product' ? ['summary'] : ['title'],
          status: 'failed',
          error: 'ORIGINAL_FAILURE',
        })
        .returning();
      const [intent] = await db
        .insert(productContentSyncIntents)
        .values({
          productId: owner.id,
          sourceRevision: 1n,
          kind: 'translation',
          status: 'failed',
          translationJobId: job!.id,
        })
        .returning();
      const beforeJobs = await entityJobRows(source.id);
      await expect(Container.get(TranslationJobService).retryProductTranslationJob(job!.id)).rejects.toThrow(
        'CONTENT_SYNC_RETRY_IDENTITY_INVALID'
      );
      expect(await entityJobRows(source.id)).toEqual(beforeJobs);
      expect(await intents(owner.id)).toEqual([intent]);
    }
  );

  it('retry 등록과 포인터 갱신 사이 실패는 새 job 없이 원본 job·영어·provenance·intent를 보존한다', async () => {
    const product = await seed();
    const [failedJob] = await db
      .insert(translationJobs)
      .values({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        fields: ['name', 'summary', 'description', 'features'],
        status: 'failed',
        error: 'PROVIDER_FAILED',
        sourceHash: 'failed-snapshot-hash',
        model: 'offline-fixture',
        promptVersion: 'sync-test',
      })
      .returning();
    const [translation] = await db
      .insert(productContentSyncIntents)
      .values({
        productId: product.id,
        sourceRevision: 4n,
        kind: 'translation',
        status: 'failed',
        translationJobId: failedJob!.id,
      })
      .returning();
    await db.insert(translations).values([
      {
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        field: 'name',
        value: 'Original name',
        sourceHash: createHash('sha256').update(product.name).digest('hex'),
        model: 'offline-fixture',
        promptVersion: 'sync-test',
      },
      {
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        field: 'summary',
        value: 'Summary',
        sourceHash: createHash('sha256').update(product.summary!).digest('hex'),
        model: 'offline-fixture',
        promptVersion: 'sync-test',
      },
    ]);
    const before = {
      jobs: await entityJobRows(product.id),
      intents: await intents(product.id),
      rows: await storedTranslations(product.id),
      product: (await db.select().from(products).where(eq(products.id, product.id)))[0],
    };
    await connection.unsafe('DROP TRIGGER IF EXISTS reject_retry_pointer ON product_content_sync_intents');
    await connection.unsafe('DROP FUNCTION IF EXISTS reject_retry_pointer()');
    await connection.unsafe(
      `CREATE FUNCTION reject_retry_pointer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic retry pointer rejection'; END $$`
    );
    await connection.unsafe(
      `CREATE TRIGGER reject_retry_pointer BEFORE UPDATE ON product_content_sync_intents FOR EACH ROW WHEN (NEW.id = '${translation!.id}') EXECUTE FUNCTION reject_retry_pointer()`
    );
    try {
      const response = await mutate('mutation($id:String!){ retryTranslationJob(id:$id){ id status retryOfJobId } }', {
        id: failedJob!.id,
      });
      expect(response.errors?.length).toBeGreaterThan(0);
      expect(response.data?.retryTranslationJob ?? null).toBeNull();
      // 등록과 포인터 갱신이 한 commit이므로 실패 뒤 새 runnable job은 0건이다.
      expect(await entityJobRows(product.id)).toEqual(before.jobs);
      expect(await intents(product.id)).toEqual(before.intents);
      expect(await storedTranslations(product.id)).toEqual(before.rows);
      expect((await db.select().from(products).where(eq(products.id, product.id)))[0]).toEqual(before.product);
    } finally {
      await connection.unsafe('DROP TRIGGER reject_retry_pointer ON product_content_sync_intents');
      await connection.unsafe('DROP FUNCTION reject_retry_pointer()');
    }
  });

  it('commit 뒤 미전송 enqueue는 tick이 새 job을 재발견하고 worker 완료가 최신 연결을 남긴다', async () => {
    const product = await seed();
    const [failedJob] = await db
      .insert(translationJobs)
      .values({
        entityType: 'Product',
        entityId: product.id,
        locale: 'en',
        fields: ['name', 'summary', 'description', 'features'],
        status: 'failed',
        error: 'PROVIDER_FAILED',
      })
      .returning();
    await db.insert(productContentSyncIntents).values({
      productId: product.id,
      sourceRevision: 4n,
      kind: 'translation',
      status: 'failed',
      translationJobId: failedJob!.id,
    });
    const queueUrl = process.env['TRANSLATION_QUEUE_URL'];
    process.env['TRANSLATION_QUEUE_URL'] = '';
    let retryId: string;
    try {
      const response = await mutate('mutation($id:String!){ retryTranslationJob(id:$id){ id status retryOfJobId } }', {
        id: failedJob!.id,
      });
      expect(response.errors).toBeUndefined();
      expect(response.data.retryTranslationJob).toMatchObject({
        status: 'pending',
        retryOfJobId: failedJob!.id,
      });
      retryId = response.data.retryTranslationJob.id as string;
      expect(retryId).not.toBe(failedJob!.id);
    } finally {
      if (queueUrl === undefined) delete process.env['TRANSLATION_QUEUE_URL'];
      else process.env['TRANSLATION_QUEUE_URL'] = queueUrl;
    }
    // enqueue가 누락돼도 새 job과 연결이 함께 남는다.
    expect((await entityJobRows(product.id)).map(job => job.id).sort()).toEqual([failedJob!.id, retryId].sort());
    expect((await intents(product.id))[0]).toMatchObject({ translationJobId: retryId, status: 'pending' });
    const beforeTick = (await entityJobRows(product.id)).find(job => job.id === retryId)!;
    await recoveryTick({}, context, () => {});
    const afterTick = (await entityJobRows(product.id)).find(job => job.id === retryId)!;
    // 기존 recovery tick이 새 job을 재발견해 전송 예약을 남긴다.
    expect(afterTick.nextDispatchAt.getTime()).toBeGreaterThan(beforeTick.nextDispatchAt.getTime());
    await runTranslation(retryId, product.id);
    expect((await entityJobRows(product.id)).find(job => job.id === retryId)?.status).toBe('completed');
    expect((await entityJobRows(product.id)).find(job => job.id === failedJob!.id)?.status).toBe('failed');
    const latest = await sync.latestStatus(product.slug);
    expect(latest.translationJobId).toBe(retryId);
    expect(latest).toMatchObject({ translationJobStatus: 'completed', translationIntent: { status: 'completed' } });
    expect((await storedTranslations(product.id)).every(Boolean)).toBe(true);
  }, 15_000);

  it('search-only revision 증가는 번역 연결을 제거하지 않고 retry는 그 최신 번역 intent에 연결한다', async () => {
    const product = await seed();
    await repository.updateById(product.id, value => {
      value.update({ summary: '발행 요약' });
      return value;
    });
    const translation = (await intents(product.id)).find(row => row.kind === 'translation')!;
    failTranslation = true;
    await runTranslation(translation.translationJobId!, product.id);
    failTranslation = false;
    // 의미 동일 서식 편집은 search-only revision만 만든다.
    await repository.updateById(product.id, value => {
      value.update({ description: '<p class="display"><strong>본문</strong></p>' });
      return value;
    });
    const afterFormat = await intents(product.id);
    expect(afterFormat.filter(row => row.kind === 'translation')).toHaveLength(1);
    expect(afterFormat.find(row => row.kind === 'translation')?.translationJobId).toBe(translation.translationJobId);
    const retry = await Container.get(TranslationJobService).retryProductTranslationJob(translation.translationJobId!);
    expect(retry.retryOfJobId).toBe(translation.translationJobId);
    const linked = (await intents(product.id)).find(row => row.id === translation.id);
    expect(linked).toMatchObject({ translationJobId: retry.id, status: 'pending' });
    // search-only revision이 늘어도 번역 intent는 유지되고 새 번역 intent를 만들지 않는다.
    expect((await intents(product.id)).filter(row => row.kind === 'translation')).toHaveLength(1);
    expect((await intents(product.id)).filter(row => row.kind === 'search')).toHaveLength(2);
  }, 15_000);

  it('비-sync Magazine retry와 pending 재전송은 기존 행동을 보존한다', async () => {
    const [magazine] = await db
      .insert(magazines)
      .values({
        title: '번역 매거진',
        slug: `retry-${randomUUID()}`,
        summary: '매거진 요약',
        content: '<p>매거진 본문</p>',
        backgroundImageUrl: 'https://example.invalid/magazine.png',
        authorId: 'offline-admin',
      })
      .returning();
    const requested = await mutate(
      'mutation($entityId:String!){ requestTranslation(entityType:"Magazine",entityId:$entityId,fields:["title","summary"]){ id status } }',
      { entityId: magazine!.id }
    );
    expect(requested.errors).toBeUndefined();
    const jobId = requested.data.requestTranslation.id as string;
    expect(requested.data.requestTranslation.status).toBe('pending');
    const resend = await mutate('mutation($id:String!){ retryTranslationJob(id:$id){ id status } }', { id: jobId });
    expect(resend.errors).toBeUndefined();
    // pending 재전송은 새 job을 만들지 않는다.
    expect(resend.data.retryTranslationJob.id).toBe(jobId);
    expect(await entityJobRows(magazine!.id)).toHaveLength(1);
    await Container.get(TranslationJobService).executeTranslationJob(jobId, {
      entityType: 'Magazine',
      entityId: magazine!.id,
    });
    expect((await entityJobRows(magazine!.id))[0]?.status).toBe('failed');
    const intentsBefore = await db.select().from(productContentSyncIntents);
    const retry = await mutate(
      'mutation($id:String!){ retryTranslationJob(id:$id){ id status retryOfJobId fields } }',
      {
        id: jobId,
      }
    );
    expect(retry.errors).toBeUndefined();
    expect(retry.data.retryTranslationJob).toMatchObject({
      status: 'pending',
      retryOfJobId: jobId,
      fields: ['title', 'summary'],
    });
    expect(retry.data.retryTranslationJob.id).not.toBe(jobId);
    // 비-sync 엔티티 retry는 intent를 만들거나 갱신하지 않는다.
    expect(await db.select().from(productContentSyncIntents)).toEqual(intentsBefore);
  }, 15_000);

  it('실제 freshness 쿼리는 legacy provenance와 optional 원문을 구분하고 일반 사용자를 거절한다', async () => {
    const product = await seed();
    await db.update(products).set({ description: null }).where(eq(products.id, product.id));
    await db.insert(translations).values({
      entityType: 'Product',
      entityId: product.id,
      locale: 'en',
      field: 'name',
      value: 'Legacy English',
      sourceHash: null,
    });
    const query =
      'query($id:String!){ translationFreshness(entityType:"Product",entityId:$id,fields:["name","summary","description"]){field status} }';
    const result = await mutate(query, { id: product.id });
    expect(result.errors).toBeUndefined();
    expect(result.data.translationFreshness).toEqual(
      expect.arrayContaining([
        { field: 'name', status: 'stale' },
        { field: 'summary', status: 'missing' },
        { field: 'description', status: 'current' },
      ])
    );
    const admin = Container.get(GetAccount);
    const infraEnv = process.env['INFRA_ENV'];
    try {
      process.env['INFRA_ENV'] = 'verification';
      Container.set(GetAccount, { execute: async () => ({ id: 'ordinary-user', roles: [] }) } as never);
      const denied = await mutate(query, { id: product.id });
      expect(denied.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ extensions: expect.objectContaining({ code: 'UNAUTHORIZED' }) }),
        ])
      );
      expect(denied.data).toBeNull();
      const deniedSync = await mutate('mutation($slug:String!){ retryProductContentSync(slug:$slug){productId} }', {
        slug: product.slug,
      });
      expect(deniedSync.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ extensions: expect.objectContaining({ code: 'UNAUTHORIZED' }) }),
        ])
      );
      expect(deniedSync.data).toBeNull();
      expect(await intents(product.id)).toEqual([]);
    } finally {
      Container.set(GetAccount, admin);
      if (infraEnv === undefined) delete process.env['INFRA_ENV'];
      else process.env['INFRA_ENV'] = infraEnv;
    }
  });

  it.each([
    ['9', '10'],
    ['9007199254740993', '9007199254740994'],
  ])('Mongo Long %s/%s는 후착과 동시 insert에서 최신 payload와 votes를 보존한다', async (old, latest) => {
    const id = randomUUID();
    const payload = (name: string, revision: string) =>
      new SearchableProduct({
        id,
        slug: id,
        name,
        summary: '요약',
        votes: 37,
        sourceRevision: revision,
      });
    await Promise.all([search.index(id, payload('이전', old)), search.index(id, payload('최신', latest))]);
    await search.index(id, payload('후착 이전', old));
    await search.index(id, payload('동일 revision 다른 값', latest));
    const row = await SearchableProductModel.collection.findOne({ productId: id }, { promoteLongs: false });
    expect(row?.name).toBe('최신');
    expect(row?.votes).toBe(37);
    expect(mongo.Long.isLong(row?.sourceRevision)).toBe(true);
    expect(row?.sourceRevision.toString()).toBe(latest);
  });

  it('legacy missing만 -1이며 null/string/double/범위 밖 revision은 payload를 보존하고 거절한다', async () => {
    const id = randomUUID();
    await SearchableProductModel.collection.insertOne({
      productId: id,
      name: 'legacy',
      votes: 19,
    });
    await search.index(
      id,
      new SearchableProduct({
        id,
        slug: id,
        name: '새 문서',
        summary: '요약',
        sourceRevision: '0',
      })
    );
    expect((await SearchableProductModel.collection.findOne({ productId: id }))?.votes).toBe(19);
    for (const malformed of [null, '9', new mongo.Double(9)]) {
      const key = randomUUID();
      await SearchableProductModel.collection.insertOne({
        productId: key,
        name: '보존 값',
        sourceRevision: malformed,
      });
      await expect(
        search.index(
          key,
          new SearchableProduct({
            slug: key,
            name: '덮어쓰기',
            summary: '요약',
            sourceRevision: '10',
          })
        )
      ).rejects.toMatchObject({ code: 'SEARCH_REVISION_INVALID' });
      expect((await SearchableProductModel.collection.findOne({ productId: key }))?.name).toBe('보존 값');
    }
    await expect(
      search.index(
        id,
        new SearchableProduct({
          slug: id,
          name: '덮어쓰기',
          summary: '요약',
          sourceRevision: '9223372036854775808',
        })
      )
    ).rejects.toMatchObject({ code: 'SEARCH_REVISION_INVALID' });
  });

  it('pre-read 뒤 malformed revision이 들어와도 Mongo pipeline이 payload를 보존하고 거절한다', async () => {
    const id = randomUUID();
    await search.index(
      id,
      new SearchableProduct({
        slug: id,
        name: '보존 문서',
        summary: '요약',
        votes: 29,
        sourceRevision: '9',
      })
    );
    const collection = SearchableProductModel.collection;
    const findOne = collection.findOne.bind(collection);
    const read = vi.spyOn(collection, 'findOne').mockImplementationOnce(async (...args) => {
      const previous = await findOne(...args);
      await collection.updateOne({ productId: id }, { $set: { sourceRevision: '9' } });
      return previous;
    });
    try {
      await expect(
        search.index(
          id,
          new SearchableProduct({
            slug: id,
            name: '덮어쓰기',
            summary: '새 요약',
            sourceRevision: '10',
          })
        )
      ).rejects.toMatchObject({ code: 'SEARCH_REVISION_INVALID' });
      expect(await findOne({ productId: id })).toMatchObject({
        name: '보존 문서',
        summary: '요약',
        votes: 29,
        sourceRevision: '9',
      });
    } finally {
      read.mockRestore();
    }
  });

  it('GraphQL은 미발행/미존재 Product를 거절하고 lossless revision과 실제 intent status만 반환한다', async () => {
    const product = await seed();
    await db
      .update(products)
      .set({ contentRevision: BigInt('9007199254740993') })
      .where(eq(products.id, product.id));
    const response = await mutate(
      'mutation($slug:String!){ indexProduct(input:{slug:$slug}){ intentId productId sourceRevision status } }',
      { slug: product.slug }
    );
    expect(response.errors).toBeUndefined();
    expect(response.data.indexProduct).toMatchObject({
      productId: product.id,
      sourceRevision: '9007199254740993',
      status: 'pending',
    });
    const result = await mutate(
      'query($slug:String!){ productContentSyncStatus(slug:$slug){ searchStatus sourceRevision } }',
      { slug: product.slug }
    );
    expect(result.data.productContentSyncStatus.searchStatus).toBe('pending');
    await db.update(products).set({ publishedAt: null }).where(eq(products.id, product.id));
    expect(
      (await mutate('mutation($slug:String!){ indexProduct(input:{slug:$slug}){ status } }', { slug: product.slug }))
        .errors[0].extensions.code
    ).toBe('PRODUCT_NOT_PUBLISHED');
    expect((await mutate('mutation{ indexProduct(input:{slug:"missing"}){ status } }', {})).errors).toHaveLength(1);
    const graph = await mutate(
      'query { __schema { mutationType { fields { name type { ofType { fields { name } } } } } } }',
      {}
    );
    const index = graph.data.__schema.mutationType.fields.find(
      (field: { name: string }) => field.name === 'indexProduct'
    );
    expect(index.type.ofType.fields.map((field: { name: string }) => field.name)).toEqual(
      expect.arrayContaining(['intentId', 'productId', 'sourceRevision', 'status'])
    );
    expect(index.type.ofType.fields.map((field: { name: string }) => field.name)).not.toContain('indexed');
  }, 10_000);

  it('수동 index intent 기록 실패는 실제 GraphQL 오류이며 canonical Product를 보존한다', async () => {
    const product = await seed();
    await connection.unsafe(
      `CREATE FUNCTION reject_sync_intent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic intent rejection'; END $$`
    );
    await connection.unsafe(
      `CREATE TRIGGER reject_sync_intent BEFORE INSERT ON product_content_sync_intents FOR EACH ROW EXECUTE FUNCTION reject_sync_intent()`
    );
    try {
      const response = await mutate('mutation($slug:String!){ indexProduct(input:{slug:$slug}){ status } }', {
        slug: product.slug,
      });
      expect(response.errors[0].extensions.code).toBe('CONTENT_SYNC_INTENT_WRITE_FAILED');
      expect(await intents(product.id)).toHaveLength(0);
      expect((await db.select().from(products).where(eq(products.id, product.id)))[0]).toMatchObject({
        name: product.name,
        contentRevision: BigInt(0),
      });
    } finally {
      await connection.unsafe('DROP TRIGGER reject_sync_intent ON product_content_sync_intents');
      await connection.unsafe('DROP FUNCTION reject_sync_intent()');
    }
  });

  it('duplicate identity preflight rejects non-destructively before creating the unique index', async () => {
    const id = randomUUID();
    const collection = SearchableProductModel.collection;
    await collection.dropIndex('search_product_identity');
    await collection.insertMany([
      { productId: id, name: '첫 문서', votes: 17 },
      { productId: id, name: '두 번째 문서', votes: 23 },
    ]);
    try {
      const fresh = new MongodbSearchableProductRepository(async () => {});
      await expect(
        fresh.index(
          id,
          new SearchableProduct({
            slug: id,
            name: '덮어쓰기',
            summary: '요약',
            sourceRevision: '1',
          })
        )
      ).rejects.toThrow('SEARCH_DUPLICATE_PRODUCT_ID');
      expect(
        (await collection.find({ productId: id }).toArray()).map(row => ({
          name: row.name,
          votes: row.votes,
        }))
      ).toEqual([
        { name: '첫 문서', votes: 17 },
        { name: '두 번째 문서', votes: 23 },
      ]);
    } finally {
      await collection.deleteMany({ productId: id });
      await collection.createIndex({ productId: 1 }, { unique: true, name: 'search_product_identity' });
    }
  });
});

const screenshotSuite = databaseUrl ? describe : describe.skip;
screenshotSuite('screenshot deletion checkpoint in isolated PostgreSQL', () => {
  let connection: Sql;
  let writerConnection: Sql;
  let db: PostgresJsDatabase;
  let writerDb: PostgresJsDatabase;
  const writerName = `screenshot-delete-${randomUUID()}`;

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/darun_content_sync')
      throw new Error('Only the isolated local darun_content_sync database is allowed');
    connection = postgres(databaseUrl!, { prepare: false, max: 4, connection: { statement_timeout: 10000 } });
    writerConnection = postgres(databaseUrl!, {
      prepare: false,
      // The locked domain validator still reads references through the repository's own connection.
      max: 2,
      connection: { application_name: writerName, statement_timeout: 10000 },
    });
    db = drizzle(connection);
    writerDb = drizzle(writerConnection);
    await migrate(db, { migrationsFolder: resolve(process.cwd(), 'scripts/migrations') });
    Container.set(ProductContentSyncRegistrarToken, { register: registerProductContentSync });
  }, 30_000);

  afterAll(async () => {
    Container.remove(ProductContentSyncRegistrarToken);
    await writerConnection?.end({ timeout: 5 });
    await connection?.end({ timeout: 5 });
  });

  type ScreenshotFixture = {
    product: typeof products.$inferSelect;
    screenshot: typeof productScreenshots.$inferSelect;
    screenshots: Array<typeof productScreenshots.$inferSelect>;
  };

  async function seed(published = true): Promise<ScreenshotFixture> {
    const [product] = await db
      .insert(products)
      .values({
        name: '삭제 경계 제품',
        slug: randomUUID(),
        summary: '요약',
        description: '<p>본문</p>',
        logoUrl: 'https://example.invalid/logo.png',
        publishedAt: published ? new Date() : null,
        contentRevision: BigInt(7),
      })
      .returning();
    const screenshots = await db
      .insert(productScreenshots)
      .values([
        {
          productId: product!.id,
          imageUrl: `https://example.invalid/${product!.id}/first.png`,
          imageAlt: '첫 화면',
          platform: 'WEB',
        },
        {
          productId: product!.id,
          imageUrl: `https://example.invalid/${product!.id}/second.png`,
          imageAlt: '다음 화면',
          platform: 'WEB',
        },
      ])
      .returning();
    if (published)
      await db.insert(productContentSyncIntents).values({
        productId: product!.id,
        sourceRevision: BigInt(7),
        kind: 'search',
      });
    return { product: product!, screenshot: screenshots[0]!, screenshots };
  }

  async function state(productId: string) {
    return {
      product: (await db.select().from(products).where(eq(products.id, productId)))[0],
      screenshots: await db
        .select()
        .from(productScreenshots)
        .where(eq(productScreenshots.productId, productId))
        .orderBy(productScreenshots.id),
      intents: await db
        .select()
        .from(productContentSyncIntents)
        .where(eq(productContentSyncIntents.productId, productId))
        .orderBy(productContentSyncIntents.sourceRevision),
      jobs: await db.select().from(translationJobs).where(eq(translationJobs.entityId, productId)),
    };
  }

  function deletion(imageDeleter: { delete(url: string): Promise<void> }, session = db) {
    const screenshots = new PostgresqlProductScreenshotRepository(session as never);
    return {
      screenshots,
      usecase: new DeleteProductScreenshot(screenshots, new PostgresqlProductFlowRepository(session as never)),
      cleanup: new PostgresqlScreenshotCleanup(session as never, imageDeleter, new ScreenshotCleanupQueueService()),
    };
  }

  async function intent(screenshotId: string) {
    return (
      await db.select().from(screenshotCleanupIntents).where(eq(screenshotCleanupIntents.screenshotId, screenshotId))
    )[0];
  }

  function pausedDeletion(remote: { delete(url: string): Promise<void> }) {
    const ready = deferred();
    const release = deferred();
    const execute = (id: string) =>
      db.transaction(async tx => {
        await deletion(remote, tx as never).usecase.execute(id);
        ready.resolve();
        await release.promise;
      });
    return { ready, release, execute };
  }

  function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>(done => {
      resolve = done;
    });
    return { promise, resolve };
  }

  async function waitForWriterLock(applicationName = writerName) {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const rows =
        await connection`select 1 from pg_stat_activity where application_name = ${applicationName} and wait_event_type = 'Lock'`;
      if (rows.length) return;
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    throw new Error('Screenshot/Flow writer did not wait for the Product-first mutex');
  }

  function flowInput(fixture: ScreenshotFixture) {
    return {
      productId: fixture.product.id,
      title: '가입 과정',
      description: '합성 흐름',
      platform: 'WEB',
      flowType: 'SIGN_UP',
      steps: fixture.screenshots.map((screenshot, index) => ({
        screenshotId: screenshot.id,
        caption: `단계 ${index + 1}`,
      })),
    };
  }

  it('UI 요소 저장 실패는 메타데이터·요소·revision·intent와 캐시를 모두 보존한다', async () => {
    const { product, screenshot } = await seed();
    await db.insert(productScreenshotUiElements).values({ screenshotId: screenshot.id, element: 'CARD' });
    const repository = new PostgresqlProductScreenshotRepository(db as never);
    const update = new UpdateProductScreenshot(repository);
    const cached = await repository.findManyByProductIdSortByPriorityDesc(product.id);
    const before = await state(product.id);
    const elementsBefore = await db
      .select()
      .from(productScreenshotUiElements)
      .where(eq(productScreenshotUiElements.screenshotId, screenshot.id));
    await connection.unsafe(
      `CREATE FUNCTION reject_screenshot_elements() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic UI element insertion failure'; END $$`
    );
    await connection.unsafe(
      `CREATE TRIGGER reject_screenshot_elements BEFORE INSERT ON product_screenshot_ui_elements FOR EACH ROW WHEN (NEW.screenshot_id = '${screenshot.id}') EXECUTE FUNCTION reject_screenshot_elements()`
    );
    try {
      await expect(
        update.execute({
          id: screenshot.id,
          imageAlt: '바뀐 설명',
          title: '바뀐 제목',
          platform: 'IOS',
          uiElements: ['BUTTON'],
        })
      ).rejects.toThrow();
      expect(await state(product.id)).toEqual(before);
      expect(
        await db
          .select()
          .from(productScreenshotUiElements)
          .where(eq(productScreenshotUiElements.screenshotId, screenshot.id))
      ).toEqual(elementsBefore);
      expect(await repository.findManyByProductIdSortByPriorityDesc(product.id)).toEqual(cached);
    } finally {
      await connection.unsafe('DROP TRIGGER reject_screenshot_elements ON product_screenshot_ui_elements');
      await connection.unsafe('DROP FUNCTION reject_screenshot_elements()');
    }
  });

  it.each([undefined, null, []] as const)('UI 요소 입력 %j의 유지·전체 삭제 의미를 보존한다', async uiElements => {
    const { product, screenshot } = await seed();
    await db.insert(productScreenshotUiElements).values({ screenshotId: screenshot.id, element: 'CARD' });
    const repository = new PostgresqlProductScreenshotRepository(db as never);
    await repository.findManyByProductIdSortByPriorityDesc(product.id);
    const update = new UpdateProductScreenshot(repository);
    await update.execute({
      id: screenshot.id,
      imageAlt: '변경 후 설명',
      platform: 'WEB',
      uiElements,
    });
    expect((await repository.findById(screenshot.id))?.imageAlt).toBe('변경 후 설명');
    expect(
      (await repository.findManyByProductIdSortByPriorityDesc(product.id)).find(row => row.id === screenshot.id)
        ?.imageAlt
    ).toBe('변경 후 설명');
    expect((await repository.findScreenshotUiElementsByScreenshotIds([screenshot.id]))[screenshot.id]).toEqual(
      uiElements === undefined ? ['CARD'] : []
    );
    expect((await state(product.id)).product?.contentRevision).toBe(BigInt(8));
    expect((await state(product.id)).intents.map(intent => intent.sourceRevision)).toEqual([BigInt(7), BigInt(8)]);
  });

  it('요소 삽입 중에도 Product 잠금을 유지하고 동시 수정의 메타데이터·요소를 함께 확정한다', async () => {
    const { product, screenshot } = await seed();
    await db.insert(productScreenshotUiElements).values({ screenshotId: screenshot.id, element: 'CARD' });
    const before = await state(product.id);
    const gate = postgres(databaseUrl!, { prepare: false, max: 1 });
    const secondName = `screenshot-update-${randomUUID()}`;
    const secondConnection = postgres(databaseUrl!, {
      prepare: false,
      max: 2,
      connection: { application_name: secondName, statement_timeout: 10000 },
    });
    await gate`select pg_advisory_lock(4502026, 1)`;
    await connection.unsafe(
      `CREATE FUNCTION pause_screenshot_elements() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(4502026, 1); RETURN NEW; END $$`
    );
    await connection.unsafe(
      `CREATE TRIGGER pause_screenshot_elements BEFORE INSERT ON product_screenshot_ui_elements FOR EACH ROW WHEN (NEW.screenshot_id = '${screenshot.id}') EXECUTE FUNCTION pause_screenshot_elements()`
    );
    const first = new UpdateProductScreenshot(new PostgresqlProductScreenshotRepository(writerDb as never));
    const secondDb = drizzle(secondConnection);
    const second = new UpdateProductScreenshot(new PostgresqlProductScreenshotRepository(secondDb as never));
    const writes: Promise<unknown>[] = [];
    try {
      writes.push(
        first.execute({
          id: screenshot.id,
          title: '첫 요청',
          imageAlt: '첫 설명',
          platform: 'IOS',
          uiElements: ['CARD', 'BUTTON', 'CARD'],
        })
      );
      await waitForWriterLock();
      // A separate reader cannot observe metadata or a checkpoint before tags are committed.
      expect(await state(product.id)).toEqual(before);
      writes.push(
        second.execute({
          id: screenshot.id,
          title: '둘째 요청',
          imageAlt: '둘째 설명',
          platform: 'ANDROID',
          uiElements: ['MODAL'],
        })
      );
      await waitForWriterLock(secondName);
      const [blocked] =
        await connection`select cardinality(pg_blocking_pids(pid)) as count from pg_stat_activity where application_name = ${secondName} and wait_event_type = 'Lock'`;
      expect(blocked?.count).toBeGreaterThan(0);
      await gate`select pg_advisory_unlock(4502026, 1)`;
      await Promise.all(writes);
      const repository = new PostgresqlProductScreenshotRepository(db as never);
      expect(await repository.findById(screenshot.id)).toMatchObject({
        title: '둘째 요청',
        imageAlt: '둘째 설명',
        platform: 'ANDROID',
      });
      expect((await repository.findScreenshotUiElementsByScreenshotIds([screenshot.id]))[screenshot.id]).toEqual([
        'MODAL',
      ]);
      const final = await state(product.id);
      expect(final.product?.contentRevision).toBe(BigInt(9));
      expect(final.intents.map(intent => intent.sourceRevision)).toEqual([BigInt(7), BigInt(8), BigInt(9)]);
    } finally {
      await gate`select pg_advisory_unlock(4502026, 1)`;
      await Promise.allSettled(writes);
      await connection.unsafe('DROP TRIGGER pause_screenshot_elements ON product_screenshot_ui_elements');
      await connection.unsafe('DROP FUNCTION pause_screenshot_elements()');
      await secondConnection.end({ timeout: 5 });
      await gate.end({ timeout: 5 });
    }
  });

  it('요소만 교체하는 저장도 중복 정규화·전체 삭제와 metadata 보존을 지원한다', async () => {
    const { product, screenshot } = await seed();
    const before = await state(product.id);
    const repository = new PostgresqlProductScreenshotRepository(db as never);
    expect(await repository.replaceScreenshotUiElements(screenshot.id, ['CARD', 'BUTTON', 'CARD'])).toEqual([
      'CARD',
      'BUTTON',
    ]);
    expect((await repository.findScreenshotUiElementsByScreenshotIds([screenshot.id]))[screenshot.id]).toEqual([
      'BUTTON',
      'CARD',
    ]);
    expect(await state(product.id)).toEqual(before);
    expect(await repository.replaceScreenshotUiElements(screenshot.id, [])).toEqual([]);
    expect((await repository.findScreenshotUiElementsByScreenshotIds([screenshot.id]))[screenshot.id]).toEqual([]);
  });

  it('DB commit 실패는 원격 이미지를 삭제하지 않는다', async () => {
    const { product, screenshot } = await seed();
    const before = await state(product.id);
    const remote = { delete: vi.fn(async () => {}) };
    await connection.unsafe(
      `CREATE FUNCTION reject_screenshot_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic commit failure'; END $$`
    );
    await connection.unsafe(
      `CREATE CONSTRAINT TRIGGER reject_screenshot_commit AFTER UPDATE ON products DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.id = '${product.id}') EXECUTE FUNCTION reject_screenshot_commit()`
    );
    try {
      await expect(deletion(remote).usecase.execute(screenshot.id)).rejects.toThrow();
      expect(remote.delete).not.toHaveBeenCalled();
      expect(await intent(screenshot.id)).toBeUndefined();
      expect(await state(product.id)).toEqual(before);
    } finally {
      await connection.unsafe('DROP TRIGGER reject_screenshot_commit ON products');
      await connection.unsafe('DROP FUNCTION reject_screenshot_commit()');
    }
  });

  it.each(['revision', 'intent', 'cleanup'] as const)(
    '%s 저장 실패는 원격 호출 없이 행·이미지·revision·기존 intent를 보존한다',
    async checkpoint => {
      const { product, screenshot } = await seed();
      const before = await state(product.id);
      const images = new Set([screenshot.imageUrl]);
      const remote = {
        delete: vi.fn(async (url: string) => {
          images.delete(url);
        }),
      };
      const { usecase, screenshots } = deletion(remote);
      await screenshots.findManyByProductIdSortByPriorityDesc(product.id);
      const table =
        checkpoint === 'revision'
          ? 'products'
          : checkpoint === 'intent'
            ? 'product_content_sync_intents'
            : 'screenshot_cleanup_intents';
      const event = checkpoint === 'revision' ? 'UPDATE OF content_revision' : 'INSERT';
      const predicate =
        checkpoint === 'revision'
          ? `NEW.id = '${product.id}'`
          : checkpoint === 'cleanup'
            ? `NEW.screenshot_id = '${screenshot.id}'`
            : `NEW.product_id = '${product.id}'`;
      await connection.unsafe(
        `CREATE FUNCTION reject_screenshot_checkpoint() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic screenshot checkpoint rejection'; END $$`
      );
      await connection.unsafe(
        `CREATE TRIGGER reject_screenshot_checkpoint BEFORE ${event} ON ${table} FOR EACH ROW WHEN (${predicate}) EXECUTE FUNCTION reject_screenshot_checkpoint()`
      );
      try {
        await expect(usecase.execute(screenshot.id)).rejects.toThrow();
        expect(remote.delete).not.toHaveBeenCalled();
        expect(await intent(screenshot.id)).toBeUndefined();
        expect(images.has(screenshot.imageUrl)).toBe(true);
        expect(await state(product.id)).toEqual(before);
        expect(await screenshots.findManyByProductIdSortByPriorityDesc(product.id)).toHaveLength(2);
      } finally {
        await connection.unsafe(`DROP TRIGGER reject_screenshot_checkpoint ON ${table}`);
        await connection.unsafe('DROP FUNCTION reject_screenshot_checkpoint()');
      }
    }
  );

  it.each([true, false])('정상 삭제는 원격 존재=%s에서도 commit 이후 worker가 이미지를 정리한다', async exists => {
    const { product, screenshot } = await seed();
    const images = new Set(exists ? [screenshot.imageUrl] : []);
    const remote = {
      delete: vi.fn(async (url: string) => {
        images.delete(url);
      }),
    };
    const { usecase, screenshots, cleanup } = deletion(remote);
    expect(await screenshots.findManyByProductIdSortByPriorityDesc(product.id)).toHaveLength(2);
    await usecase.execute(screenshot.id);
    expect(remote.delete).not.toHaveBeenCalled();
    expect(await intent(screenshot.id)).toMatchObject({
      status: 'pending',
      imageUrl: screenshot.imageUrl,
    });
    await cleanup.execute((await intent(screenshot.id))!.id);
    expect(await intent(screenshot.id)).toMatchObject({
      status: 'completed',
      attemptCount: 1,
    });
    expect(remote.delete).toHaveBeenCalledExactlyOnceWith(screenshot.imageUrl);
    expect(images.size).toBe(0);
    expect(await screenshots.findManyByProductIdSortByPriorityDesc(product.id)).toHaveLength(1);
    const after = await state(product.id);
    expect(after.screenshots.map(row => row.id)).not.toContain(screenshot.id);
    expect(after.product?.contentRevision).toBe(BigInt(8));
    expect(
      after.intents.map(({ sourceRevision, kind, status }) => ({
        sourceRevision,
        kind,
        status,
      }))
    ).toEqual([
      { sourceRevision: BigInt(7), kind: 'search', status: 'superseded' },
      { sourceRevision: BigInt(8), kind: 'search', status: 'pending' },
    ]);
    expect(after.jobs).toEqual([]);
  });

  it('원격 삭제 실패는 commit된 삭제를 되돌리지 않고 재시도 의도를 남긴다', async () => {
    const { product, screenshot } = await seed();
    const remote = {
      delete: vi.fn(async () => {
        throw new Error('provider failed');
      }),
    };
    const { usecase, screenshots, cleanup } = deletion(remote);
    await usecase.execute(screenshot.id);
    await cleanup.execute((await intent(screenshot.id))!.id);
    expect(await screenshots.findById(screenshot.id)).toBeNull();
    expect((await state(product.id)).product?.contentRevision).toBe(BigInt(8));
    expect(await intent(screenshot.id)).toMatchObject({
      status: 'pending',
      attemptCount: 1,
      error: 'SCREENSHOT_IMAGE_DELETE_FAILED',
    });
    await cleanup.execute((await intent(screenshot.id))!.id);
    expect(remote.delete).toHaveBeenCalledTimes(1); // retryAfter prevents early duplicates.
  });

  it('원격 삭제 응답 유실 후 재시도는 이미 없는 이미지를 성공 처리한다', async () => {
    const { screenshot } = await seed();
    const images = new Set([screenshot.imageUrl]);
    const remote = {
      delete: vi.fn(async (url: string) => {
        if (images.delete(url)) throw new Error('response lost after delete');
      }),
    };
    const { usecase, cleanup } = deletion(remote);
    await usecase.execute(screenshot.id);
    const job = (await intent(screenshot.id))!;
    await cleanup.execute(job.id);
    expect(images.size).toBe(0);
    expect(await intent(screenshot.id)).toMatchObject({
      status: 'pending',
      attemptCount: 1,
    });
    await db
      .update(screenshotCleanupIntents)
      .set({ retryAfter: new Date(0) })
      .where(eq(screenshotCleanupIntents.id, job.id));
    await cleanup.execute(job.id);
    await cleanup.execute(job.id);
    expect(remote.delete).toHaveBeenCalledTimes(2);
    expect(await intent(screenshot.id)).toMatchObject({
      status: 'completed',
      attemptCount: 2,
      error: null,
    });
  });

  it('원격 I/O 동안 Product 잠금을 놓고 중복 worker와 만료된 worker의 후착 실패를 격리한다', async () => {
    const fixture = await seed();
    const ready = deferred();
    const release = deferred();
    const images = new Set([fixture.screenshot.imageUrl]);
    const remote = {
      delete: vi.fn(async (url: string) => {
        if (images.delete(url)) {
          ready.resolve();
          await release.promise;
          throw new Error('terminated worker resumes with failure');
        }
      }),
    };
    const { usecase, cleanup } = deletion(remote);
    await usecase.execute(fixture.screenshot.id);
    const job = (await intent(fixture.screenshot.id))!;
    const pending = cleanup.execute(job.id);
    try {
      await Promise.race([ready.promise, pending]);
      await cleanup.execute(job.id);
      expect(remote.delete).toHaveBeenCalledTimes(1);
      // Separate DB connection can acquire the Product lock while provider I/O is still suspended.
      await writerDb.transaction(async tx => {
        const product = await lockProductSource(tx as never, fixture.product.id);
        expect(product.contentRevision).toBe(BigInt(8));
      });
      await expect(
        new CreateProductFlow(new PostgresqlProductFlowRepository(writerDb as never)).execute(flowInput(fixture))
      ).rejects.toMatchObject({ code: 'product-flow/invalid-args' });
      // Simulate a worker ending after remote success and before recording completion.
      await db
        .update(screenshotCleanupIntents)
        .set({ leaseUntil: new Date(0) })
        .where(eq(screenshotCleanupIntents.id, job.id));
      await cleanup.execute(job.id);
      expect(await intent(fixture.screenshot.id)).toMatchObject({
        status: 'completed',
        attemptCount: 2,
      });
    } finally {
      release.resolve();
      await pending;
    }
    expect(await intent(fixture.screenshot.id)).toMatchObject({
      status: 'completed',
      attemptCount: 2,
      error: null,
    });
    expect(remote.delete).toHaveBeenCalledTimes(2);
    expect(
      await db.select().from(productFlowSteps).where(eq(productFlowSteps.screenshotId, fixture.screenshot.id))
    ).toEqual([]);
  }, 15_000);

  it('전송 실패와 worker 종료는 다음 recovery dispatch에서 다시 보낸다', async () => {
    // Isolate this dispatch's budget from previously generated pending cleanup fixtures.
    await db.update(screenshotCleanupIntents).set({ dispatchAfter: new Date('2100-01-01') });
    const { screenshot } = await seed();
    await deletion({ delete: vi.fn() }).usecase.execute(screenshot.id);
    const job = (await intent(screenshot.id))!;
    const sendIntent = vi.fn().mockRejectedValueOnce(new Error('SQS response lost')).mockResolvedValue(true);
    const cleanup = new PostgresqlScreenshotCleanup(db as never, { delete: vi.fn() }, { sendIntent } as never);
    expect(await cleanup.dispatch()).toEqual({ recovered: 1, queued: 0 });
    expect(await cleanup.dispatch()).toEqual({ recovered: 0, queued: 0 });
    await db
      .update(screenshotCleanupIntents)
      .set({
        dispatchAfter: new Date(0),
        status: 'in_progress',
        leaseToken: 'dead-worker',
        leaseUntil: new Date(0),
        attemptCount: 1,
      })
      .where(eq(screenshotCleanupIntents.id, job.id));
    expect(await cleanup.dispatch()).toEqual({ recovered: 1, queued: 1 });
    expect(sendIntent).toHaveBeenNthCalledWith(2, job.id);
  });

  it('미발행 제품 삭제는 revision만 갱신하고 검색·번역 작업은 만들지 않는다', async () => {
    const { product, screenshot } = await seed(false);
    const remote = { delete: vi.fn(async () => {}) };
    await deletion(remote).usecase.execute(screenshot.id);
    const after = await state(product.id);
    expect(remote.delete).not.toHaveBeenCalled();
    expect(await intent(screenshot.id)).toMatchObject({
      status: 'pending',
      imageUrl: screenshot.imageUrl,
    });
    expect(after.product?.contentRevision).toBe(BigInt(8));
    expect(after.screenshots).toHaveLength(1);
    expect(after.intents).toEqual([]);
    expect(after.jobs).toEqual([]);
  });

  it('다른 connection의 Flow 참조가 먼저 commit되면 잠금 안 typed 오류로 거절한다', async () => {
    const fixture = await seed();
    const ready = deferred();
    const release = deferred();
    const remote = { delete: vi.fn(async () => {}) };
    const flow = db.transaction(async tx => {
      await lockProductSource(tx as never, fixture.product.id);
      await new CreateProductFlow(new PostgresqlProductFlowRepository(tx as never)).execute(flowInput(fixture));
      ready.resolve();
      await release.promise;
    });
    await Promise.race([ready.promise, flow]);
    const pending = deletion(remote, writerDb).usecase.execute(fixture.screenshot.id);
    const rejected = expect(pending).rejects.toMatchObject({
      code: 'product-screenshot/in-use',
    });
    try {
      await waitForWriterLock();
    } finally {
      release.resolve();
    }
    await flow;
    await rejected;
    expect(remote.delete).not.toHaveBeenCalled();
    const after = await state(fixture.product.id);
    expect(after.screenshots).toHaveLength(2);
    expect(after.product?.contentRevision).toBe(BigInt(8));
    expect(after.jobs).toEqual([]);
    // The now-committed reference is also rejected by the existing early check.
    await expect(deletion(remote).usecase.execute(fixture.screenshot.id)).rejects.toMatchObject({
      code: 'product-screenshot/in-use',
    });
    expect(remote.delete).not.toHaveBeenCalled();
    expect(await state(fixture.product.id)).toEqual(after);
  }, 15_000);

  it('삭제 commit까지 잠금을 유지하여 후행 Flow가 dangling 참조를 만들지 못한다', async () => {
    const fixture = await seed();
    const remote = { delete: vi.fn(async () => {}) };
    const { ready, release, execute } = pausedDeletion(remote);
    const pending = execute(fixture.screenshot.id);
    await Promise.race([ready.promise, pending]);
    const flow = new CreateProductFlow(new PostgresqlProductFlowRepository(writerDb as never)).execute(
      flowInput(fixture)
    );
    const rejected = expect(flow).rejects.toMatchObject({
      code: 'product-flow/invalid-args',
    });
    try {
      await waitForWriterLock();
    } finally {
      release.resolve();
    }
    await pending;
    await rejected;
    expect(await db.select().from(productFlows).where(eq(productFlows.productId, fixture.product.id))).toEqual([]);
    expect(
      await db.select().from(productFlowSteps).where(eq(productFlowSteps.screenshotId, fixture.screenshot.id))
    ).toEqual([]);
    const after = await state(fixture.product.id);
    expect(after.screenshots).toHaveLength(1);
    expect(after.product?.contentRevision).toBe(BigInt(8));
    expect(after.intents.filter(row => row.sourceRevision === BigInt(8)).map(row => row.kind)).toEqual(['search']);
    expect(after.jobs).toEqual([]);
  }, 15_000);

  it('삭제 commit을 기다린 Apply는 삭제 전 screenshot 근거 후보를 거절한다', async () => {
    const fixture = await seed();
    const evidence = await new PostgresqlProductDescriptionEvidenceAssembler(db as never).assemble(fixture.product.id);
    const [candidate] = await db
      .insert(productDescriptionJobs)
      .values({
        productId: fixture.product.id,
        status: 'completed',
        candidateHtml: '<p>스크린샷 근거 소개</p>',
        evidenceHash: evidence.evidenceHash,
        evidenceHashVersion: 'v2',
        baseDescriptionHash: evidence.baseDescriptionHash,
      })
      .returning();
    const remote = { delete: vi.fn(async () => {}) };
    const { ready, release, execute } = pausedDeletion(remote);
    const pending = execute(fixture.screenshot.id);
    await Promise.race([ready.promise, pending]);
    const applied = new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(writerDb as never))
      .execute({ jobId: candidate!.id })
      .then(
        result => ({ result }),
        error => ({ error })
      );
    try {
      await waitForWriterLock();
    } finally {
      release.resolve();
    }
    await pending;
    expect(await applied).toMatchObject({ error: { code: 'STALE_CANDIDATE' } });
    expect(remote.delete).not.toHaveBeenCalled();
    const after = await state(fixture.product.id);
    expect(after.product?.contentRevision).toBe(BigInt(8));
    expect(after.screenshots).toHaveLength(1);
    expect(after.product?.description).toBe(fixture.product.description);
    expect(after.jobs).toEqual([]);
    expect(after.intents.filter(row => row.sourceRevision === BigInt(8)).map(row => row.kind)).toEqual(['search']);
    const [job] = await db.select().from(productDescriptionJobs).where(eq(productDescriptionJobs.id, candidate!.id));
    expect(job?.appliedAt).toBeNull();
  }, 15_000);

  it('삭제를 기다린 번역 commit은 screenshot-only revision으로 폐기되거나 새 job을 만들지 않는다', async () => {
    const fixture = await seed();
    const jobs = new PostgresqlTranslationJobRepository(db as never);
    const job = await jobs.createJob({
      entityType: 'Product',
      entityId: fixture.product.id,
      fields: ['name', 'summary'],
    });
    await jobs.claimJobLease({
      jobId: job.id,
      leaseToken: 'screenshot-translation',
      leaseUntil: new Date(Date.now() + 60_000),
    });
    const store = new PostgresqlTranslationSourceStore(writerDb as never);
    const snapshot = await store.read({
      entityType: 'Product',
      entityId: fixture.product.id,
      fields: ['name', 'summary'],
    });
    const remote = { delete: vi.fn(async () => {}) };
    const { ready, release, execute } = pausedDeletion(remote);
    const pending = execute(fixture.screenshot.id);
    await Promise.race([ready.promise, pending]);
    const completed = store.commit({
      jobId: job.id,
      leaseToken: 'screenshot-translation',
      snapshot,
      rows: snapshot.values.map(source => ({
        ...source,
        locale: 'en',
        value: `English ${source.field}`,
      })),
      model: 'offline-screenshot-fixture',
      promptVersion: 'screenshot-mutex-test',
    });
    try {
      await waitForWriterLock();
    } finally {
      release.resolve();
    }
    await pending;
    expect(await completed).toBe('completed');
    const after = await state(fixture.product.id);
    expect(after.screenshots).toHaveLength(1);
    expect(after.product?.contentRevision).toBe(BigInt(8));
    expect(after.jobs).toHaveLength(1);
    expect(after.jobs[0]).toMatchObject({
      id: job.id,
      status: 'completed',
      sourceHash: snapshot.sourceHash,
    });
    expect(after.intents.filter(row => row.sourceRevision === BigInt(8)).map(row => row.kind)).toEqual(['search']);
    const rows = await db.select().from(translations).where(eq(translations.entityId, fixture.product.id));
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      const source = row.field === 'name' ? fixture.product.name : fixture.product.summary;
      expect(row).toMatchObject({
        value: `English ${row.field}`,
        sourceHash: createHash('sha256').update(source).digest('hex'),
        model: 'offline-screenshot-fixture',
        promptVersion: 'screenshot-mutex-test',
      });
    }
  }, 15_000);
});

// This suite needs PostgreSQL only; the full file is also run by the publication CI gate.
(databaseUrl ? describe : describe.skip)('publish-once: 최초 발행과 재시도', () => {
  let control: Sql;
  const writers: Sql[] = [];
  let stores: Array<{
    product: PostgresqlProductRepository;
    magazine: PostgresqlMagazineRepository;
  }>;
  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/darun_content_sync') {
      throw new Error('Only isolated local content sync database is allowed');
    }
    control = postgres(databaseUrl!, { max: 1 });
    await migrate(drizzle(control), {
      migrationsFolder: resolve(process.cwd(), 'scripts/migrations'),
    });
    stores = [0, 1].map(() => {
      const writer = postgres(databaseUrl!, { max: 1 });
      writers.push(writer);
      const database = drizzle(writer);
      return {
        product: new PostgresqlProductRepository(database),
        magazine: new PostgresqlMagazineRepository(database),
      };
    });
    Container.set(ProductContentSyncRegistrarToken, {
      register: registerProductContentSync,
    });
  }, 30000);
  afterAll(async () => {
    await Promise.all(writers.map(writer => writer.end({ timeout: 5 })));
    if (control) await control.end({ timeout: 5 });
    Container.remove(ProductContentSyncRegistrarToken);
  });

  for (const kind of ['product', 'magazine'] as const) {
    const table = kind === 'product' ? 'products' : 'magazines';
    const seed = async () => {
      const id = randomUUID().replaceAll('-', '').slice(0, 26);
      const shared = {
        id,
        slug: `once-${id}`,
        updated_at: '2020-01-02T03:04:05Z',
      };
      const row =
        kind === 'product'
          ? {
              ...shared,
              name: '도구',
              summary: '새 소개',
              logo_url: 'https://example.com/logo.png',
            }
          : {
              ...shared,
              title: '새 소식',
              author_id: 'author',
              background_image_url: 'https://example.com/bg.png',
            };
      await control`insert into ${control(table)} ${control(row)}`;
      return id;
    };
    const snapshot = async (id: string) => {
      const rows = await control`select *, xmin::text as row_version,
        (extract(epoch from published_at) * 1000)::float8 as published_at_ms,
        (extract(epoch from updated_at) * 1000)::float8 as updated_at_ms
        from ${control(table)} where id = ${id}`;
      const intents = await control`select * from product_content_sync_intents where product_id = ${id} order by kind`;
      const jobs = await control`select * from translation_jobs where entity_id = ${id}`;
      return { rows: [...rows], intents: [...intents], jobs: [...jobs] };
    };

    it(`${kind}: 응답 유실 뒤 재시도해도 발행일·수정일·revision·intent를 보존한다`, async () => {
      const id = await seed();
      const firstOperation =
        kind === 'product' ? new PublishProduct(stores[0].product) : new PublishMagazine(stores[0].magazine);
      const result = await firstOperation.execute({ id });
      expect(result.publishedAt).toBeInstanceOf(Date);
      const first = await snapshot(id);
      expect(first.rows[0].updated_at_ms).not.toBe(new Date('2020-01-02T03:04:05Z').getTime());
      // A persisted old date makes a second timestamp write observably wrong without a clock sleep.
      const original = new Date('2021-06-07T08:09:10Z');
      await control`update ${control(table)} set published_at = ${original.toISOString()}, updated_at = ${original.toISOString()} where id = ${id}`;
      const before = await snapshot(id);
      const retryOperation =
        kind === 'product' ? new PublishProduct(stores[1].product) : new PublishMagazine(stores[1].magazine);
      const retry = await retryOperation.execute({ id });
      expect(retry.publishedAt).toEqual(original);
      expect(retry.updatedAt).toEqual(original);
      expect(await snapshot(id)).toEqual(before);
      if (kind === 'product') {
        expect(first.rows[0].content_revision).toBe('1');
        expect(first.intents.map(intent => intent.kind)).toEqual(['search', 'translation']);
        expect(first.jobs).toHaveLength(1);
      }
    });

    it(`${kind}: 서로 다른 두 connection의 동시 최초 발행이 한 번만 전이한다`, async () => {
      const id = await seed();
      const pending: Array<Promise<Product | Magazine>> = [];
      const identities = await Promise.all(writers.map(writer => writer`select pg_backend_pid() as pid`));
      const writerPids = identities.map(rows => rows[0].pid);
      try {
        await control.begin(async tx => {
          await tx`select id from ${tx(table)} where id = ${id} for update`;
          for (const store of stores) {
            const operation =
              kind === 'product' ? new PublishProduct(store.product) : new PublishMagazine(store.magazine);
            const request = operation.execute({ id });
            // Observe early failures without leaving unhandled promises while the holder runs.
            void request.catch(() => undefined);
            pending.push(request);
          }
          const deadline = Date.now() + 5000;
          for (;;) {
            await tx`select pg_stat_clear_snapshot()`;
            const [waiting] = await tx`
              select count(*)::int as count from pg_stat_activity
              where pid = any(${writerPids}) and wait_event_type = 'Lock'`;
            if (waiting.count === 2) break;
            if (Date.now() > deadline) throw new Error('Both publication connections must wait on the held row');
            await new Promise<void>(resolve => setImmediate(resolve));
          }
        });
        const [first, second] = await Promise.all(pending);
        expect(first.publishedAt).toBeInstanceOf(Date);
        expect(second.publishedAt).toEqual(first.publishedAt);
        expect(second.updatedAt).toEqual(first.updatedAt);
        const persisted = await snapshot(id);
        expect(persisted.rows[0].published_at_ms).toBe(first.publishedAt?.getTime());
        expect(persisted.rows[0].updated_at_ms).toBe(first.updatedAt?.getTime());
        if (kind === 'product') {
          expect(persisted.rows[0].content_revision).toBe('1');
          expect(persisted.intents.map(intent => intent.kind)).toEqual(['search', 'translation']);
          expect(persisted.jobs).toHaveLength(1);
        }
      } finally {
        await Promise.allSettled(pending);
      }
    }, 10000);

    it(`${kind}: 존재하지 않는 대상은 기존 not-found 오류를 반환한다`, async () => {
      const operation =
        kind === 'product' ? new PublishProduct(stores[0].product) : new PublishMagazine(stores[0].magazine);
      await expect(operation.execute({ id: 'missing-publish-once' })).rejects.toMatchObject({
        code: `${kind}/not-found`,
      });
    });
  }

  it('product: 동기화 등록 실패는 발행일·수정일·revision과 함께 rollback된다', async () => {
    const [row] = await drizzle(control)
      .insert(products)
      .values({
        name: '등록 실패',
        slug: `rollback-${randomUUID()}`,
        summary: '소개',
        logoUrl: 'https://example.com/logo.png',
        updatedAt: new Date('2020-01-02T03:04:05Z'),
      })
      .returning();
    Container.set(ProductContentSyncRegistrarToken, {
      register: async () => {
        throw new Error('synthetic registrar failure');
      },
    });
    try {
      await expect(new PublishProduct(stores[0].product).execute({ id: row.id })).rejects.toThrow(
        'synthetic registrar failure'
      );
      const [persisted] = await drizzle(control).select().from(products).where(eq(products.id, row.id));
      expect(persisted).toEqual(row);
      expect(await control`select id from product_content_sync_intents where product_id = ${row.id}`).toHaveLength(0);
      expect(await control`select id from translation_jobs where entity_id = ${row.id}`).toHaveLength(0);
    } finally {
      Container.set(ProductContentSyncRegistrarToken, { register: registerProductContentSync });
    }
    const recovered = await new PublishProduct(stores[0].product).execute({ id: row.id });
    expect(recovered.publishedAt).toBeInstanceOf(Date);
  });
});
