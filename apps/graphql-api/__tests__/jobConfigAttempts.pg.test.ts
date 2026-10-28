import 'reflect-metadata';
import {
  ApplyProductDescriptionCandidate,
  GenerateProductDescriptionCandidate,
  GetProduct,
  CategoryRepositoryToken,
  ProductResearchJobRepositoryToken,
} from '@darun/products-domain';
import { ProductDescriptionJobService, ProductResearchService } from '@darun/products-service';
import {
  PostgresqlLlmSettingRepository,
  PostgresqlTranslationJobRepository,
  LlmTranslationProvider,
} from '@darun/translation-datasource';
import { LlmSettingService, TranslationJobService } from '@darun/translation-service';
import type * as UtilsLlm from '@darun/utils-llm';
import { LlmClient, LLM_DEFAULT_KEY_REJECTION_MESSAGE } from '@darun/utils-llm';
import type { Context, SQSEvent, SQSHandler } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type * as GraphQL from 'graphql';
import postgres, { type Sql } from 'postgres';
import { buildSchemaSync } from 'type-graphql';
import { Container } from 'typedi';
import type { MockInstance } from 'vitest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { productDescriptionJobs } from '../../../libs/products/datasource/src/entities/ProductDescriptionJobSchema';
import { productResearchJobs } from '../../../libs/products/datasource/src/entities/ProductResearchJobSchema';
import { products } from '../../../libs/products/datasource/src/entities/ProductSchema';
import { PostgresqlProductDescriptionApplyStore } from '../../../libs/products/datasource/src/repositories/PostgresqlProductDescriptionApplyStore';
import { PostgresqlProductDescriptionEvidenceAssembler } from '../../../libs/products/datasource/src/repositories/PostgresqlProductDescriptionEvidenceAssembler';
import { PostgresqlProductDescriptionJobRepository } from '../../../libs/products/datasource/src/repositories/PostgresqlProductDescriptionJobRepository';
import { PostgresqlProductRepository } from '../../../libs/products/datasource/src/repositories/PostgresqlProductRepository';
import { PostgresqlProductResearchJobRepository } from '../../../libs/products/datasource/src/repositories/PostgresqlProductResearchJobRepository';
import { ProductDescriptionGeneratorImpl } from '../../../libs/products/datasource/src/services/ProductDescriptionGeneratorImpl';
import { ProductDescriptionMutationResolver } from '../../../libs/products/feature/src/ProductDescription.mutation.resolver';
import { ProductDescriptionQueryResolver } from '../../../libs/products/feature/src/ProductDescription.query.resolver';
import { ProductPublishMutationResolver } from '../../../libs/products/feature/src/ProductPublishMutationResolver';
import { translationJobs } from '../../../libs/translation/datasource/src/entities/TranslationJobSchema';
import { translations } from '../../../libs/translation/datasource/src/entities/TranslationSchema';
import { TranslationMutationResolver } from '../../../libs/translation/feature/src/Translation.mutation.resolver';
import { TranslationQueryResolver } from '../../../libs/translation/feature/src/Translation.query.resolver';
import { PostgresqlProductContentSync } from '../src/adapters/PostgresqlProductContentSync';
import { PostgresqlTranslationSourceStore } from '../src/adapters/PostgresqlTranslationSourceStore';

const transport = vi.hoisted(() => ({
  create: vi.fn(),
  search: vi.fn(),
  fetch: vi.fn(),
  realBrave: false,
  constructors: vi.fn(),
}));
vi.mock('../src/config', () => ({}));
vi.mock('../src/config/database', () => ({
  createPostgresConnection: () => {},
}));
vi.mock('openai', () => ({
  default: class {
    constructor(options: unknown) {
      transport.constructors(options);
    }
    chat = { completions: { create: transport.create } };
  },
}));
vi.mock('@darun/utils-llm', async importOriginal => {
  const actual = await importOriginal<typeof UtilsLlm>();
  return {
    ...actual,
    BraveSearchClient: class {
      constructor(keyProvider?: ConstructorParameters<typeof actual.BraveSearchClient>[0]) {
        if (transport.realBrave) return new actual.BraveSearchClient(keyProvider);
      }
      search = transport.search;
    },
  };
});
import { handler as descriptionWorker } from '../src/functions/product-description-worker';
import { handler as researchWorker } from '../src/functions/product-research-worker';
import { handler as translationWorker } from '../src/functions/translation-worker';

const { graphql, isObjectType } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;
const databaseUrl = process.env['JOB_CONFIG_ATTEMPTS_TEST_DATABASE_URL'];
const suite = databaseUrl ? describe : describe.skip;
const schedulingFields = 'dispatchStatus runNotBefore nextDispatchAt retryOfJobId';

suite('Claimed configuration attempts in dedicated PostgreSQL', () => {
  let connection: Sql;
  let db: PostgresJsDatabase;
  let client: LlmClient;
  let settings: PostgresqlLlmSettingRepository;
  let description: PostgresqlProductDescriptionJobRepository;
  let research: PostgresqlProductResearchJobRepository;
  let translation: PostgresqlTranslationJobRepository;
  let descriptionService: ProductDescriptionJobService;
  let translationService: TranslationJobService;
  let settingsRead: MockInstance<PostgresqlLlmSettingRepository['findSetting']>;
  let product: typeof products.$inferSelect;
  const originalKey = process.env['OPEN_ROUTER_API_KEY'];
  const originalBraveKey = process.env['BRAVE_API_KEY'];

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (url.hostname !== '127.0.0.1' || url.pathname !== '/darun_job_config_attempts')
      throw new Error('Only dedicated local darun_job_config_attempts is allowed');
    connection = postgres(databaseUrl!, { max: 6, prepare: false });
    db = drizzle(connection);
    await migrate(db, {
      migrationsFolder: resolve(process.cwd(), 'scripts/migrations'),
    });
    settings = new PostgresqlLlmSettingRepository(db as never);
    settingsRead = vi.spyOn(settings, 'findSetting');
    const settingService = new LlmSettingService(settings);
    client = new LlmClient(settingService);
    description = new PostgresqlProductDescriptionJobRepository(db as never);
    research = new PostgresqlProductResearchJobRepository(db as never);
    translation = new PostgresqlTranslationJobRepository(db as never);
    const sourceStore = new PostgresqlTranslationSourceStore(db as never);
    const getProduct = new GetProduct(new PostgresqlProductRepository(db as never));
    descriptionService = new ProductDescriptionJobService(
      getProduct,
      new GenerateProductDescriptionCandidate(
        new PostgresqlProductDescriptionEvidenceAssembler(db as never),
        new ProductDescriptionGeneratorImpl(client)
      ),
      description,
      { sendJob: async () => true } as never
    );
    translationService = new TranslationJobService(
      getProduct,
      new LlmTranslationProvider(client),
      translation,
      sourceStore,
      { sendJob: async () => true } as never
    );
    Container.set(LlmClient, client);
    Container.set(LlmSettingService, settingService);
    Container.set(ProductDescriptionJobService, descriptionService);
    Container.set(TranslationJobService, translationService);
    Container.set(
      ProductResearchService,
      new ProductResearchService(research, {
        findAll: async () => [],
      } as never)
    );
    Container.set(ProductResearchJobRepositoryToken, research);
    Container.set(CategoryRepositoryToken, { findAll: async () => [] });
    // Reconciliation is real PostgreSQL; these standalone jobs have no sync intent owner.
    const sync = new PostgresqlProductContentSync(db as never, {} as never, {} as never);
    Container.set(PostgresqlProductContentSync, sync);
    Container.set(
      ProductDescriptionQueryResolver,
      new ProductDescriptionQueryResolver(descriptionService, sync, getProduct)
    );
    Container.set(ProductDescriptionMutationResolver, new ProductDescriptionMutationResolver(descriptionService));
    Container.set(TranslationQueryResolver, new TranslationQueryResolver(translationService, {} as never, sourceStore));
    Container.set(TranslationMutationResolver, new TranslationMutationResolver(translationService));
    Container.set(
      ProductPublishMutationResolver,
      new ProductPublishMutationResolver(
        undefined as never,
        undefined as never,
        undefined as never,
        undefined as never,
        getProduct,
        undefined as never,
        undefined as never,
        undefined as never,
        undefined as never,
        undefined as never,
        undefined as never,
        undefined as never,
        undefined as never,
        undefined as never,
        new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(db as never)),
        descriptionService
      )
    );
    process.env['OPEN_ROUTER_API_KEY'] = 'synthetic-environment-key';
  }, 30_000);
  beforeEach(async () => {
    transport.realBrave = false;
    transport.fetch.mockReset().mockImplementation(() => {
      throw new Error('Unexpected unconfigured synthetic search transport');
    });
    vi.stubGlobal('fetch', transport.fetch);
    process.env['BRAVE_API_KEY'] = 'synthetic-environment-brave-key';
    transport.create.mockReset();
    transport.constructors.mockClear();
    transport.search.mockReset().mockResolvedValue({
      ok: true,
      results: [
        {
          title: 'Synthetic product',
          url: 'https://example.test/about',
          description: 'Synthetic product provides reviewed notes.',
          extraSnippets: [],
        },
      ],
    });
    settingsRead.mockClear();
    await settings.updateSetting(current => ({
      thinkingLevel: current?.thinkingLevel ?? null,
      endpoint: 'https://synthetic-provider.test/v1',
      apiKey: 'synthetic-provider-key',
      model: 'model-before',
      braveApiKey: 'synthetic-stored-brave-key',
    }));
    settingsRead.mockClear();
    [product] = (await db
      .insert(products)
      .values({
        name: '합성 제품',
        summary: '합성 요약',
        description: '<p>원문</p>',
        slug: randomUUID(),
        logoUrl: 'https://example.test/logo.png',
        categoryIds: [],
      })
      .returning()) as [typeof product];
  });
  afterAll(async () => {
    Container.reset();
    if (originalKey === undefined) delete process.env['OPEN_ROUTER_API_KEY'];
    else process.env['OPEN_ROUTER_API_KEY'] = originalKey;
    if (originalBraveKey === undefined) delete process.env['BRAVE_API_KEY'];
    else process.env['BRAVE_API_KEY'] = originalBraveKey;
    vi.unstubAllGlobals();
    await connection?.end({ timeout: 5 });
  });

  async function deliver(worker: SQSHandler, payload: object, remainingMs = 300_000) {
    await worker(
      {
        Records: [{ messageId: randomUUID(), body: JSON.stringify(payload) }],
      } as SQSEvent,
      { getRemainingTimeInMillis: () => remainingMs } as Context,
      () => {}
    );
  }
  async function create(kind: 'description' | 'translation' | 'research') {
    if (kind === 'description') {
      const job = await description.createJob({ productId: product.id });
      return {
        id: job.id,
        worker: descriptionWorker,
        payload: { jobId: job.id, productId: product.id },
        read: () => description.findJobById(job.id),
        table: productDescriptionJobs,
      };
    }
    if (kind === 'translation') {
      const job = await translation.createJob({
        entityType: 'Product',
        entityId: product.id,
        fields: ['name'],
      });
      return {
        id: job.id,
        worker: translationWorker,
        payload: { jobId: job.id, entityType: 'Product', entityId: product.id },
        read: () => translation.findJobById(job.id),
        table: translationJobs,
      };
    }
    const job = await research.createPendingJob({
      requestKey: randomUUID(),
      officialUrl: 'https://example.test/',
    });
    return {
      id: job.id,
      worker: researchWorker,
      payload: { jobId: job.id },
      read: () => research.findById(job.id),
      table: productResearchJobs,
    };
  }

  describe('실제 Brave 키 소비 경계', () => {
    beforeEach(() => {
      transport.realBrave = true;
      Container.set(LlmClient, new LlmClient(Container.get(LlmSettingService)));
    });
    afterEach(() => {
      Container.set(LlmClient, client);
      transport.realBrave = false;
    });

    it('활성 lease 중복은 키 조회와 검색·모델 호출을 시작하지 않는다', async () => {
      const fixture = await create('research');
      await research.claimJob({
        jobId: fixture.id,
        leaseToken: randomUUID(),
        leaseUntil: new Date(Date.now() + 300_000),
      });
      const claimed = await research.findById(fixture.id);
      await deliver(researchWorker, fixture.payload);
      expect(await research.findById(fixture.id)).toEqual(claimed);
      expect(settingsRead).not.toHaveBeenCalled();
      expect(transport.fetch).not.toHaveBeenCalled();
      expect(transport.search).not.toHaveBeenCalled();
      expect(transport.create).not.toHaveBeenCalled();
    });

    it('검색 키 SQL 장애는 30초·120초 backoff 후 세 번째 attempt에서 실패한다', async () => {
      const fixture = await create('research');
      const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
      for (const log of logs) log.mockImplementation(() => {});
      await connection`ALTER TABLE llm_settings RENAME TO unavailable_llm_settings`;
      try {
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (attempt > 1)
            await db
              .update(productResearchJobs)
              .set({ runNotBefore: new Date(0), nextDispatchAt: new Date(0) })
              .where(eq(productResearchJobs.id, fixture.id));
          await deliver(researchWorker, fixture.payload);
          const row = await research.findById(fixture.id);
          expect(row).toMatchObject({
            attemptCount: attempt,
            status: attempt === 3 ? 'failed' : 'pending',
            errorCode: 'SEARCH_UNAVAILABLE',
            errorMessage: '저장된 LLM 설정을 읽지 못했습니다.',
            leaseToken: null,
            leaseUntil: null,
          });
          if (attempt < 3) {
            expect(row!.dispatchStatus).toBe('BACKOFF');
            expect(row!.runNotBefore!.getTime() - row!.updatedAt.getTime()).toBe(attempt === 1 ? 30_000 : 120_000);
            expect(row!.nextDispatchAt).toEqual(row!.runNotBefore);
          }
          const reads = settingsRead.mock.calls.length;
          await deliver(researchWorker, fixture.payload);
          expect(await research.findById(fixture.id)).toEqual(row);
          expect(settingsRead).toHaveBeenCalledTimes(reads);
          expect(transport.fetch).not.toHaveBeenCalled();
          expect(transport.create).not.toHaveBeenCalled();
          const visible = JSON.stringify([row, ...logs.map(log => log.mock.calls)]);
          for (const sensitive of [
            'synthetic-provider-key',
            'synthetic-stored-brave-key',
            'synthetic-environment-brave-key',
            'llm_settings',
            'select ',
            '42P01',
          ])
            expect(visible).not.toContain(sensitive);
        }
        // Existing research policy retries after two failed queries, not a second retry owner.
        expect(settingsRead).toHaveBeenCalledTimes(6);
        expect(transport.search).not.toHaveBeenCalled();
      } finally {
        await connection`ALTER TABLE unavailable_llm_settings RENAME TO llm_settings`;
        for (const log of logs) log.mockRestore();
      }
    }, 15_000);

    it('설정 복구 뒤 같은 due job의 다음 attempt가 실제 검색과 합성에 성공한다', async () => {
      const fixture = await create('research');
      await connection`ALTER TABLE llm_settings RENAME TO unavailable_llm_settings`;
      try {
        await deliver(researchWorker, fixture.payload);
        expect(await research.findById(fixture.id)).toMatchObject({ status: 'pending', attemptCount: 1 });
        expect(transport.fetch).not.toHaveBeenCalled();
        expect(transport.create).not.toHaveBeenCalled();
      } finally {
        await connection`ALTER TABLE unavailable_llm_settings RENAME TO llm_settings`;
      }
      await db
        .update(productResearchJobs)
        .set({ runNotBefore: new Date(0), nextDispatchAt: new Date(0) })
        .where(eq(productResearchJobs.id, fixture.id));
      transport.fetch.mockImplementation(async (url: URL, options: RequestInit) => {
        expect(url.origin + url.pathname).toBe('https://api.search.brave.com/res/v1/web/search');
        expect(options.headers).toMatchObject({ 'X-Subscription-Token': 'synthetic-stored-brave-key' });
        expect(options.signal).toBeInstanceOf(AbortSignal);
        return new Response(
          JSON.stringify({
            web: {
              results: [
                {
                  title: 'Synthetic product',
                  url: 'https://example.test/about',
                  description: 'Synthetic product provides reviewed notes.',
                },
              ],
            },
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      });
      transport.create.mockResolvedValue({
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                name: 'Synthetic product',
                nameAnchors: [{ sourceId: 's1', excerpt: 'Synthetic product' }],
                summary: null,
                summaryAnchors: [],
                categoryCandidates: [],
                features: [],
                tags: [],
                companyCandidate: null,
                alternativeCandidates: [],
                suggestedSlug: 'synthetic-product',
                warnings: [],
              }),
            },
            finish_reason: 'stop',
          },
        ],
      });
      await deliver(researchWorker, fixture.payload);
      const row = await research.findById(fixture.id);
      expect(row).toMatchObject({ id: fixture.id, status: 'completed', attemptCount: 2, model: 'model-before' });
      expect(row!.result!.identity.name.value).toBe('Synthetic product');
      expect(row!.result!.sources[0]!.url).toBe('https://example.test/about');
      expect(transport.fetch).toHaveBeenCalledTimes(5);
      expect(transport.create).toHaveBeenCalledOnce();
      expect(transport.search).not.toHaveBeenCalled();
      const reads = settingsRead.mock.calls.length;
      await deliver(researchWorker, fixture.payload);
      expect(await research.findById(fixture.id)).toEqual(row);
      expect(settingsRead).toHaveBeenCalledTimes(reads);
      expect(transport.fetch).toHaveBeenCalledTimes(5);
      expect(transport.create).toHaveBeenCalledOnce();
    }, 15_000);

    it.each([null, '   '])(
      '정상 조회의 키 부재(%j)는 재시도 없이 SEARCH_NOT_CONFIGURED로 끝난다',
      async braveApiKey => {
        process.env['BRAVE_API_KEY'] = '   ';
        await settings.updateSetting(current => ({
          thinkingLevel: current?.thinkingLevel ?? null,
          endpoint: 'https://synthetic-provider.test/v1',
          apiKey: 'synthetic-provider-key',
          model: 'model-before',
          braveApiKey,
        }));
        const fixture = await create('research');
        await deliver(researchWorker, fixture.payload);
        const row = await research.findById(fixture.id);
        expect(row).toMatchObject({ status: 'failed', attemptCount: 1, errorCode: 'SEARCH_NOT_CONFIGURED' });
        expect(settingsRead).toHaveBeenCalledOnce();
        await deliver(researchWorker, fixture.payload);
        expect(await research.findById(fixture.id)).toEqual(row);
        expect(settingsRead).toHaveBeenCalledOnce();
        expect(transport.fetch).not.toHaveBeenCalled();
        expect(transport.search).not.toHaveBeenCalled();
        expect(transport.create).not.toHaveBeenCalled();
      }
    );
  });

  it.each(['description', 'translation', 'research'] as const)(
    '%s active lease duplicate never starts configuration or provider work',
    async kind => {
      const fixture = await create(kind);
      const lease = {
        jobId: fixture.id,
        leaseToken: randomUUID(),
        leaseUntil: new Date(Date.now() + 300_000),
      };
      if (kind === 'research') await research.claimJob(lease);
      else if (kind === 'description') await description.claimJobLease(lease);
      else await translation.claimJobLease(lease);
      const claimed = await fixture.read();
      await deliver(fixture.worker, fixture.payload);
      expect(await fixture.read()).toEqual(claimed);
      expect(settingsRead).not.toHaveBeenCalled();
      expect(transport.search).not.toHaveBeenCalled();
      expect(transport.create).not.toHaveBeenCalled();
    }
  );

  it.each(['description', 'translation', 'research'] as const)(
    '%s settings DB failure consumes fenced attempts, blocks duplicates and fails after three',
    async kind => {
      const fixture = await create(kind);
      // The actual settings repository fails while job/source tables remain available.
      await connection`ALTER TABLE llm_settings RENAME TO unavailable_llm_settings`;
      try {
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (attempt > 1)
            await db
              .update(fixture.table)
              .set({ runNotBefore: new Date(0), nextDispatchAt: new Date(0) })
              .where(eq(fixture.table.id, fixture.id));
          await deliver(fixture.worker, fixture.payload);
          const row = await fixture.read();
          expect(row).toMatchObject({
            attemptCount: attempt,
            status: attempt === 3 ? 'failed' : 'pending',
          });
          const message = row && ('errorMessage' in row ? row.errorMessage : row.error);
          expect(message).toBe('저장된 LLM 설정을 읽지 못했습니다.');
          expect(JSON.stringify(row)).not.toContain('synthetic-provider-key');
          if (attempt < 3) {
            expect(row!.dispatchStatus).toBe('BACKOFF');
            const delay = row!.runNotBefore!.getTime() - row!.updatedAt.getTime();
            expect(delay).toBe(attempt === 1 ? 30_000 : 120_000);
          }
          const reads = settingsRead.mock.calls.length;
          const searches = transport.search.mock.calls.length;
          await deliver(fixture.worker, fixture.payload);
          expect(await fixture.read()).toEqual(row);
          expect(settingsRead).toHaveBeenCalledTimes(reads);
          expect(transport.search).toHaveBeenCalledTimes(searches);
        }
        expect(settingsRead).toHaveBeenCalledTimes(3);
        expect(transport.create).not.toHaveBeenCalled();
      } finally {
        await connection`ALTER TABLE unavailable_llm_settings RENAME TO llm_settings`;
      }
    },
    15_000
  );

  it.each(['description', 'translation', 'research'] as const)(
    '%s key rejection is recorded with the existing failure classification and no transport',
    async kind => {
      await settings.updateSetting(current => ({
        braveApiKey: current?.braveApiKey ?? null,
        thinkingLevel: current?.thinkingLevel ?? null,
        endpoint: 'https://custom-provider.test/v1',
        apiKey: process.env['OPEN_ROUTER_API_KEY']!,
        model: 'rejected-model',
      }));
      const fixture = await create(kind);
      await deliver(fixture.worker, fixture.payload);
      const row = await fixture.read();
      expect(row).toMatchObject({
        attemptCount: 1,
        status: kind === 'research' ? 'pending' : 'failed',
      });
      expect(row && ('errorMessage' in row ? row.errorMessage : row.error)).toBe(LLM_DEFAULT_KEY_REJECTION_MESSAGE);
      expect(transport.create).not.toHaveBeenCalled();
      const reads = settingsRead.mock.calls.length;
      await deliver(fixture.worker, fixture.payload);
      expect(await fixture.read()).toEqual(row);
      expect(settingsRead).toHaveBeenCalledTimes(reads);
    }
  );

  it('a successful attempt keeps model, endpoint and provenance when stored settings change mid-flight', async () => {
    const job = await translation.createJob({
      entityType: 'Product',
      entityId: product.id,
      fields: ['name', 'summary'],
    });
    transport.create.mockImplementation(async () => {
      if (transport.create.mock.calls.length === 1)
        await settings.updateSetting(current => ({
          braveApiKey: current?.braveApiKey ?? null,
          thinkingLevel: current?.thinkingLevel ?? null,
          endpoint: 'https://next-provider.test/v1',
          apiKey: 'synthetic-next-key',
          model: 'model-after',
        }));
      return {
        choices: [
          {
            message: { role: 'assistant', content: 'Synthetic English notes' },
            finish_reason: 'stop',
          },
        ],
      };
    });
    await deliver(translationWorker, {
      jobId: job.id,
      entityType: 'Product',
      entityId: product.id,
    });
    expect(await translation.findJobById(job.id)).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      model: 'model-before',
    });
    expect(transport.create).toHaveBeenCalledTimes(3); // name writer, summary writer/reviewer
    for (const [request, options] of transport.create.mock.calls) {
      expect(request.model).toBe('model-before');
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }
    expect(transport.constructors).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://synthetic-provider.test/v1',
        apiKey: 'synthetic-provider-key',
        maxRetries: 0,
      })
    );
    const rows = await db.select().from(translations).where(eq(translations.entityId, product.id));
    expect(rows.filter(row => row.field === 'name' || row.field === 'summary')).toHaveLength(2);
    expect(rows.every(row => row.model === 'model-before')).toBe(true);
    const calls = transport.create.mock.calls.length;
    const reads = settingsRead.mock.calls.length;
    await deliver(translationWorker, {
      jobId: job.id,
      entityType: 'Product',
      entityId: product.id,
    });
    expect(transport.create).toHaveBeenCalledTimes(calls);
    expect(settingsRead).toHaveBeenCalledTimes(reads);
    const next = await translation.createJob({
      entityType: 'Product',
      entityId: product.id,
      fields: ['name'],
    });
    await deliver(translationWorker, {
      jobId: next.id,
      entityType: 'Product',
      entityId: product.id,
    });
    expect(await translation.findJobById(next.id)).toMatchObject({
      status: 'completed',
      model: 'model-after',
    });
  });

  it('actual GraphQL job queries and mutations retain scheduling values and new logical retry origins', async () => {
    const schema = buildSchemaSync({
      resolvers: [
        ProductDescriptionQueryResolver,
        ProductDescriptionMutationResolver,
        ProductPublishMutationResolver,
        TranslationQueryResolver,
        TranslationMutationResolver,
      ],
      container: Container,
      authChecker: () => true,
    });
    async function assertPendingResponse(
      response: unknown,
      table: typeof productDescriptionJobs | typeof translationJobs,
      retryOfJobId: string | null
    ) {
      if (!response || typeof response !== 'object' || !('id' in response) || typeof response.id !== 'string')
        throw new Error('Expected an actual job response with ID');
      const [row] = await db.select().from(table).where(eq(table.id, response.id));
      expect(row).toBeDefined();
      expect(response).toEqual({
        id: row!.id,
        dispatchStatus: 'DUE',
        runNotBefore: row!.runNotBefore.toISOString(),
        nextDispatchAt: row!.nextDispatchAt.toISOString(),
        retryOfJobId,
      });
    }
    const desc = await description.createJob({ productId: product.id });
    const trans = await translation.createJob({
      entityType: 'Product',
      entityId: product.id,
      fields: ['name'],
    });
    const future = new Date(Date.now() + 90_000);
    const reserved = new Date(Date.now() + 45_000);
    await db
      .update(productDescriptionJobs)
      .set({ runNotBefore: future, nextDispatchAt: reserved })
      .where(eq(productDescriptionJobs.id, desc.id));
    await db
      .update(translationJobs)
      .set({ runNotBefore: new Date(0), nextDispatchAt: reserved })
      .where(eq(translationJobs.id, trans.id));
    const queried = await graphql({
      schema,
      source: `query { productDescriptionJob(id: "${desc.id}") { ${schedulingFields} }
      productDescriptionJobs { id ${schedulingFields} } translationJob(id: "${trans.id}") { ${schedulingFields} }
      translationJobs { id ${schedulingFields} } }`,
    });
    expect(queried.errors).toBeUndefined();
    expect(queried.data?.productDescriptionJob).toEqual({
      dispatchStatus: 'BACKOFF',
      runNotBefore: future.toISOString(),
      nextDispatchAt: reserved.toISOString(),
      retryOfJobId: null,
    });
    expect(queried.data?.translationJob).toEqual({
      dispatchStatus: 'DISPATCH_RESERVED',
      runNotBefore: new Date(0).toISOString(),
      nextDispatchAt: reserved.toISOString(),
      retryOfJobId: null,
    });
    expect(queried.data?.productDescriptionJobs).toContainEqual({
      id: desc.id,
      ...(queried.data?.productDescriptionJob as object),
    });
    expect(queried.data?.translationJobs).toContainEqual({
      id: trans.id,
      ...(queried.data?.translationJob as object),
    });
    await db.update(productDescriptionJobs).set({ status: 'failed' }).where(eq(productDescriptionJobs.id, desc.id));
    await db.update(translationJobs).set({ status: 'failed' }).where(eq(translationJobs.id, trans.id));
    for (const [mutation, id] of [
      ['retryProductDescriptionJob', desc.id],
      ['retryTranslationJob', trans.id],
    ]) {
      const result = await graphql({
        schema,
        source: `mutation { ${mutation}(id: "${id}") { id ${schedulingFields} } }`,
      });
      expect(result.errors).toBeUndefined();
      const response = result.data?.[mutation];
      await assertPendingResponse(
        response,
        mutation === 'retryProductDescriptionJob' ? productDescriptionJobs : translationJobs,
        id!
      );
      expect(response && typeof response === 'object' && 'id' in response && response.id).not.toBe(id);
    }
    const requested = await graphql({
      schema,
      source: `mutation { requestTranslation(entityType: "Product", entityId: "${product.id}", fields: ["name"]) {
      id ${schedulingFields} } requestProductTranslation(productId: "${product.id}") { id ${schedulingFields} } }`,
    });
    expect(requested.errors).toBeUndefined();
    await assertPendingResponse(requested.data?.requestTranslation, translationJobs, null);
    await assertPendingResponse(requested.data?.requestProductTranslation, translationJobs, null);
    const generated = await graphql({
      schema,
      source: `mutation { generateProductDescription(input: { slug: "${product.slug}" }) {
      job { id ${schedulingFields} } } }`,
    });
    expect(generated.errors).toBeUndefined();
    const generatedPayload = generated.data?.generateProductDescription;
    if (!generatedPayload || typeof generatedPayload !== 'object' || !('job' in generatedPayload))
      throw new Error('Expected description generation payload');
    await assertPendingResponse(generatedPayload.job, productDescriptionJobs, null);
    const appliedAt = new Date('2026-09-12T03:04:05.000Z');
    const storedHtml = '<blockquote>stored &amp; reviewed candidate</blockquote>';
    await db
      .update(productDescriptionJobs)
      .set({
        status: 'completed',
        appliedAt,
        candidateHtml: storedHtml,
        retryOfJobId: 'historical-original',
        runNotBefore: future,
        nextDispatchAt: reserved,
      })
      .where(eq(productDescriptionJobs.id, desc.id));
    const applied = await graphql({
      schema,
      source: `mutation { applyProductDescriptionCandidate(jobId: "${desc.id}") {
      alreadyApplied job { ${schedulingFields} appliedAt candidateHtml } } }`,
    });
    expect(applied.errors).toBeUndefined();
    expect(applied.data?.applyProductDescriptionCandidate).toEqual({
      alreadyApplied: true,
      job: {
        dispatchStatus: 'COMPLETED',
        runNotBefore: future.toISOString(),
        nextDispatchAt: reserved.toISOString(),
        retryOfJobId: 'historical-original',
        appliedAt: appliedAt.toISOString(),
        candidateHtml: storedHtml,
      },
    });
    expect((await db.select().from(products).where(eq(products.id, product.id)))[0]?.description).toBe('<p>원문</p>');
    const jobFields = schema.getTypeMap();
    for (const name of Object.keys(jobFields).filter(name => /^(TranslationJob|ProductDescriptionJob)/.test(name))) {
      const graph = jobFields[name];
      expect(graph && isObjectType(graph) && Object.keys(graph.getFields())).not.toContain('leaseToken');
      expect(graph && isObjectType(graph) && Object.keys(graph.getFields())).not.toContain('apiKey');
    }
  });
  it('keeps current candidate addresses after an independent canonical slug commit on the same warm GraphQL reader', async () => {
    const schema = buildSchemaSync({
      resolvers: [ProductDescriptionQueryResolver, ProductDescriptionMutationResolver],
      container: Container,
      authChecker: () => true,
    });
    const original = await description.createJob({ productId: product.id });
    const historical = await description.createJob({ productId: product.id });
    await db
      .update(productDescriptionJobs)
      .set({ status: 'failed', error: '보존할 실패', candidateHtml: '<p>실패 전 저장</p>' })
      .where(eq(productDescriptionJobs.id, original.id));
    await db
      .update(productDescriptionJobs)
      .set({ status: 'completed', candidateHtml: '<h2>과거 후보</h2>', appliedAt: new Date('2026-10-01T00:00:00Z') })
      .where(eq(productDescriptionJobs.id, historical.id));
    const before = await db
      .select()
      .from(productDescriptionJobs)
      .where(eq(productDescriptionJobs.productId, product.id));
    const query = `query { productDescriptionJob(id: "${original.id}") { id productId productSlug }
      productDescriptionJobs(limit: 1000) { id productId productSlug } }`;
    const warm = await graphql({ schema, source: query });
    expect(warm.errors).toBeUndefined();
    expect(warm.data?.productDescriptionJob).toEqual({
      id: original.id,
      productId: product.id,
      productSlug: product.slug,
    });
    const writerConnection = postgres(databaseUrl!, { max: 1, prepare: false });
    const writerDb = drizzle(writerConnection);
    const currentSlug = `renamed-${randomUUID()}`;
    try {
      const writer = new PostgresqlProductRepository(writerDb as never);
      await writer.updateById(product.id, current => {
        current.slug = currentSlug;
        return current;
      });
    } finally {
      await writerConnection.end({ timeout: 5 });
    }
    const fresh = await graphql({ schema, source: query });
    expect(fresh.errors).toBeUndefined();
    expect(fresh.data?.productDescriptionJob).toEqual({
      id: original.id,
      productId: product.id,
      productSlug: currentSlug,
    });
    expect(fresh.data?.productDescriptionJobs).toContainEqual({
      id: historical.id,
      productId: product.id,
      productSlug: currentSlug,
    });
    expect(fresh.data?.productDescriptionJobs).toContainEqual({
      id: original.id,
      productId: product.id,
      productSlug: currentSlug,
    });
    const retry = await graphql({
      schema,
      source: `mutation { retryProductDescriptionJob(id: "${original.id}") { id productId productSlug ${schedulingFields} } }`,
    });
    expect(retry.errors).toBeUndefined();
    const retried = retry.data?.retryProductDescriptionJob as { id: string; productSlug: string; retryOfJobId: string };
    expect(retried).toMatchObject({
      productId: product.id,
      productSlug: currentSlug,
      retryOfJobId: original.id,
      dispatchStatus: 'DUE',
    });
    expect(retried.id).not.toBe(original.id);
    expect(await description.findJobById(retried.id)).toMatchObject({
      id: retried.id,
      productId: product.id,
      retryOfJobId: original.id,
      status: 'pending',
    });
    const after = await db
      .select()
      .from(productDescriptionJobs)
      .where(eq(productDescriptionJobs.productId, product.id));
    for (const row of before) expect(after).toContainEqual(row);
    expect(after).toHaveLength(before.length + 1);
    expect((await db.select().from(products).where(eq(products.id, product.id)))[0]).toMatchObject({
      slug: currentSlug,
      description: '<p>원문</p>',
    });
    expect(transport.create).not.toHaveBeenCalled();
    expect(transport.search).not.toHaveBeenCalled();
    expect(transport.fetch).not.toHaveBeenCalled();
  });

  describe('로컬 전송에서의 실제 검색 본문 중단', () => {
    beforeEach(() => {
      transport.realBrave = true;
      Container.set(LlmClient, new LlmClient(Container.get(LlmSettingService)));
      // 중단이 본문에 연결되지 않은 결함에서는 완성된 성공 payload가 저장되어 진단 가능한 실패가 되게 한다.
      transport.create.mockResolvedValue({
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                name: 'Synthetic product',
                nameAnchors: [{ sourceId: 's1', excerpt: 'Synthetic product' }],
                summary: null,
                summaryAnchors: [],
                categoryCandidates: [],
                features: [],
                tags: [],
                companyCandidate: null,
                alternativeCandidates: [],
                suggestedSlug: 'synthetic-product',
                warnings: [],
              }),
            },
            finish_reason: 'stop',
          },
        ],
      });
    });
    afterEach(() => {
      Container.set(LlmClient, client);
      transport.realBrave = false;
    });

    it('stalled body의 두 실패는 30초·120초 backoff 후 세 번째 attempt에서 failed로 끝난다', async () => {
      const fixture = await create('research');
      const expectedQueries = ProductResearchService.buildQueries('example.test', 'https://example.test/');
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
      try {
        for (let attempt = 1; attempt <= 3; attempt++) {
          const server = await startBodyServer([expectedQueries[0]!, expectedQueries[2]!], SUCCESS_BODY);
          isolateBraveTransport(server, () => vi.advanceTimersByTime(10_000));
          try {
            if (attempt > 1)
              await db
                .update(productResearchJobs)
                .set({ runNotBefore: new Date(0), nextDispatchAt: new Date(0) })
                .where(eq(productResearchJobs.id, fixture.id));
            await deliver(researchWorker, fixture.payload);
            const row = await research.findById(fixture.id);
            // stalled body의 TIMEOUT 두 번은 기존 실패 카운트로 흡수되고 재시도 예약만 남긴다.
            expect(row).toMatchObject({
              attemptCount: attempt,
              status: attempt === 3 ? 'failed' : 'pending',
              errorCode: 'SEARCH_UNAVAILABLE',
              leaseToken: null,
              leaseUntil: null,
              result: null,
            });
            if (attempt < 3) {
              expect(row!.dispatchStatus).toBe('BACKOFF');
              expect(row!.runNotBefore!.getTime() - row!.updatedAt.getTime()).toBe(attempt === 1 ? 30_000 : 120_000);
              expect(row!.nextDispatchAt).toEqual(row!.runNotBefore);
            }
            await server.drained();
            await server.stalledDone();
            // 중단 뒤에 완성된 성공 payload는 저장되지 않는다.
            expect((await research.findById(fixture.id))!.result).toBeNull();
            // 이전 요청 종료 전에 다음 요청이 시작되지 않았다.
            expect(server.maxConcurrent).toBe(1);
            expect(server.queries).toEqual(expectedQueries.slice(0, 3));
            expect(server.closes.filter(kind => kind === 'aborted')).toHaveLength(2);
            expect(server.closes.filter(kind => kind === 'finished')).toHaveLength(1);
          } finally {
            await server.close();
          }
        }
      } finally {
        vi.useRealTimers();
      }
    }, 30_000);

    it('부모 중단은 terminal 확정 없이 lease를 남기고, lease 만료 recovery의 다음 attempt가 정상 응답을 저장한다', async () => {
      const fixture = await create('research');
      const expectedQueries = ProductResearchService.buildQueries('example.test', 'https://example.test/');
      const server = await startBodyServer([expectedQueries[0]!, expectedQueries[1]!], SUCCESS_BODY);
      // Lambda 예산 16초: 첫 요청 budget(10초) 뒤 두 번째 요청의 본문이 멈춘 상태에서 부모 deadline이 중단한다.
      const advances = [10_000, 6_000];
      isolateBraveTransport(server, () => vi.advanceTimersByTime(advances.shift() ?? 10_000));
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
      try {
        await deliver(researchWorker, fixture.payload, 46_000);
        const interrupted = await research.findById(fixture.id);
        // 부모 중단은 terminal 확정 없이 in_progress lease만 남긴다.
        expect(interrupted).toMatchObject({
          status: 'in_progress',
          attemptCount: 1,
          errorCode: null,
        });
        expect(interrupted!.leaseToken).not.toBeNull();
        expect(interrupted!.leaseUntil!.getTime()).toBeGreaterThan(Date.now());
        await server.drained();
        await server.stalledDone();
        // 중단 뒤에 완성된 성공 payload는 저장되지 않는다.
        expect((await research.findById(fixture.id))!.result).toBeNull();
        expect(server.maxConcurrent).toBe(1);
        expect(server.closes).toEqual(['aborted', 'aborted']);

        // 만료된 lease는 기존 recovery가 재발견한다.
        await db
          .update(productResearchJobs)
          .set({ leaseUntil: new Date(0), nextDispatchAt: new Date(0) })
          .where(eq(productResearchJobs.id, fixture.id));
        const recoverable = await research.findRecoverableJobs({ now: new Date() });
        expect(recoverable.map(job => job.id)).toContain(fixture.id);

        // 복구된 다음 attempt는 정상 응답을 저장한다.
        server.stallQueries.length = 0;
        await deliver(researchWorker, fixture.payload);
        const row = await research.findById(fixture.id);
        expect(row).toMatchObject({ id: fixture.id, status: 'completed', attemptCount: 2, model: 'model-before' });
        expect(row!.result!.identity.name.value).toBe('Synthetic product');
        expect(row!.result!.sources[0]!.url).toBe('https://example.test/about');
        await server.drained();
        expect(server.maxConcurrent).toBe(1);
      } finally {
        vi.useRealTimers();
        await server.close();
      }
    }, 30_000);
  });
});

const nativeFetch = globalThis.fetch.bind(globalThis);
// fake timer을 켠 상태에서도 모델된 늦은 본문 완성은 실제 시간에 진행시킨다.
const realSetTimeout = globalThis.setTimeout.bind(globalThis);

type CloseKind = 'aborted' | 'finished';

interface BodyServer {
  origin: string;
  stallQueries: string[];
  queries: string[];
  closes: CloseKind[];
  maxConcurrent: number;
  drained: () => Promise<void>;
  /** stalled 응답이 중단 뒤에나 완성되는 늦은 본문 기록이 모두 끝날 때까지 기다린다. */
  stalledDone: () => Promise<void>;
  close: () => Promise<void>;
}

const SUCCESS_BODY = {
  web: {
    results: [
      {
        title: 'Synthetic product',
        url: 'https://example.test/about',
        description: 'Synthetic product provides reviewed notes.',
      },
    ],
  },
};

/**
 * 본문이 중간에 멈춘 검색 서버: 성공 헤더와 본문 앞부분을 먼저 보내고 나머지는 늦게 완성한다.
 * 고정된 클라이언트는 그 사이에 실제 요청을 중단하므로 완성된 성공 payload가 저장되지 않고,
 * 중단이 본문 소비에 연결되지 않은 결함은 멈춘 요청을 끝내지 못해 시나리오가 진행되지 않는다.
 */
async function startBodyServer(stallQueries: string[], body: unknown): Promise<BodyServer> {
  const fullBody = JSON.stringify(body);
  const queries: string[] = [];
  const closes: CloseKind[] = [];
  let active = 0;
  let maxConcurrent = 0;
  let idle: (() => void) | null = null;
  const lateWrites: Promise<void>[] = [];
  const server = createServer((req, res) => {
    active++;
    maxConcurrent = Math.max(maxConcurrent, active);
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const query = url.searchParams.get('q') ?? '';
    queries.push(query);
    res.on('close', () => {
      closes.push(res.writableFinished ? 'finished' : 'aborted');
      active--;
      if (active === 0) idle?.();
    });
    if (!stallQueries.includes(query)) {
      res.writeHead(200, { 'content-type': 'application/json', 'content-length': String(fullBody.length) });
      res.end(fullBody);
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json', 'content-length': String(fullBody.length) });
    res.on('error', () => undefined);
    res.write(fullBody.slice(0, 20));
    // 50ms는 상류가 성공 본문을 늦게 완성하는 상황을 모델한 지연이며 테스트 동기화가 아니다.
    // 동기화는 drained()/stalledDone()의 명시적 대기로만 한다.
    lateWrites.push(
      new Promise<void>(
        resolve =>
          void realSetTimeout(() => {
            res.end(fullBody.slice(20));
            resolve();
          }, 50)
      )
    );
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('BodyServer port was not assigned.');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    stallQueries,
    queries,
    closes,
    get maxConcurrent() {
      return maxConcurrent;
    },
    drained: async () => {
      while (active > 0) await new Promise<void>(resolve => void (idle = resolve));
    },
    stalledDone: () => Promise.all(lateWrites).then(() => undefined),
    close: () =>
      new Promise<void>(resolve => {
        // 완료된 요청의 keep-alive 소켓이 server.close()를 영원히 기다리게 하므로 먼저 끊는다.
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

/**
 * 실제 fetch를 로컬 서버로 격리하되 BraveSearchClient의 body 검증·분류는 유지한다.
 * 요청 목적지만 로컬 서버로 치환하며, stalled 응답이 클라이언트에 도착한 뒤에만 지정된 시간을 진행시킨다.
 */
function isolateBraveTransport(server: BodyServer, onStalledDispatch: () => void): void {
  transport.fetch.mockImplementation(async (url: URL, options: RequestInit) => {
    const response = await nativeFetch(new URL(`${url.pathname}${url.search}`, server.origin), options);
    const query = url.searchParams.get('q');
    if (query !== null && server.stallQueries.includes(query)) onStalledDispatch();
    return response;
  });
}
