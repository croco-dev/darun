import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import {
  PostgresqlCategoryRepository,
  PostgresqlProductFeatureRepository,
  PostgresqlProductFeatureScreenshotRepository,
  PostgresqlProductDescriptionJobRepository,
  PostgresqlProductDescriptionApplyStore,
  PostgresqlProductDescriptionEvidenceAssembler,
  PostgresqlProductFlowRepository,
  PostgresqlProductLinkRepository,
  PostgresqlProductPublishReview,
  PostgresqlProductRepository,
  PostgresqlProductScreenshotRepository,
} from '@darun/products-datasource';
import {
  AddProductLink,
  ApplyProductDescriptionCandidate,
  CreateProduct,
  EditProduct,
  GetAllProducts,
  GetCategories,
  GetProduct,
  GetProductFeatures,
  GetProductLinks,
  GetPublishedProduct,
  GetPublishedProductsForSitemap,
  GetRankedProducts,
  GetProductScreenshots,
  GetProductsByCategory,
  GetVisualScreenshots,
  PublishProduct,
  UpdateProductCategories,
  UpdateProductLink,
  UpdateProductScreenshot,
} from '@darun/products-domain';
import {
  AdminProductCategoriesResolver,
  ProductMutationResolver,
  ProductQueryResolver,
  ScreenshotFieldResolver,
  VisualScreenshotQueryResolver,
} from '@darun/products-feature/server';
import { ProductDescriptionJobService } from '@darun/products-service';
import type { Drizzle } from '@darun/provider-database';
import { PostgresqlAlternativeProductRepository } from '@darun/recommendation-datasource';
import { SearchableProduct, SearchProduct } from '@darun/search-domain';
import { PostgresqlTranslationRepository } from '@darun/translation-datasource';
import { TranslationService, computeSourceHash } from '@darun/translation-domain';
import { createAuthChecker } from '@darun/utils-apollo-server';
import { PostgresqlVoteRepository } from '@darun/voting-datasource';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type * as GraphQL from 'graphql';
import postgres, { type Sql } from 'postgres';
import { buildSchemaSync } from 'type-graphql';
import { Container } from 'typedi';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  AllProductsOnProductListTableDocument,
  type AllProductsOnProductListTableQuery,
  type AllProductsOnProductListTableQueryVariables,
  AdminProductCategorySelectionOnProductDetailCategorySectionDocument,
  AdminProductPublishReviewDocument,
  EditProductOnEditProductInfoDocument,
  EditProductOnEditProductDescriptionDocument,
  TempProductBySlugOnEditProductDescriptionDocument,
  UpdateProductCategoriesOnProductDetailCategorySectionDocument,
  GetProductDescriptionJobsOnAdminDocument,
  type GetProductDescriptionJobsOnAdminQuery,
  PublishProductOnPublishProductButtonDocument,
} from '../../../libs/__generated__/graphql';
import { ProductContentSyncRegistrarToken } from '../../../libs/products/datasource/src/repositories/productContentSync';
import { ProductCoreMutationResolver } from '../../../libs/products/feature/src/ProductCoreMutationResolver';
import { ProductDescriptionQueryResolver } from '../../../libs/products/feature/src/ProductDescription.query.resolver';
import { SearchRanker } from '../../../libs/search/domain/src/services/SearchRanker';
import { SynonymExpander } from '../../../libs/search/domain/src/services/SynonymExpander';
import { formatServerError } from '../../../libs/shared/utils-apollo-server/src/libs/createServer/formatError';
import { registerProductContentSync } from '../src/adapters/PostgresqlProductContentSync';
import { AdminProductPublishReviewResolver } from '../src/app/graphql/AdminProductPublishReview.resolver';
import { createGraphQLDescriptionPrecondition } from '../src/app/graphqlDescriptionPrecondition';

const { execute, graphql, print } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;

const url = process.env.PRODUCT_DETAIL_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const cases = [
  {
    table: 'product_links',
    parent: 'product_id',
    value: 'title',
    fields: {
      icon_url: '',
      link: 'https://example.com',
      display_link: 'example.com',
    },
    reader: (db: Drizzle) => {
      const repository = new PostgresqlProductLinkRepository(db);
      return (id: string) => repository.findManyByProductId(id);
    },
  },
  {
    table: 'product_features',
    parent: 'product_id',
    value: 'name',
    fields: { emoji: 'x', summary: 'feature summary' },
    reader: (db: Drizzle) => {
      const repository = new PostgresqlProductFeatureRepository(db);
      return (id: string) => repository.findManyByProductId(id);
    },
  },
  {
    table: 'product_screenshots',
    parent: 'product_id',
    value: 'image_alt',
    fields: { image_url: 'https://example.com/product.png' },
    reader: (db: Drizzle) => {
      const repository = new PostgresqlProductScreenshotRepository(db);
      return (id: string) => repository.findManyByProductIdSortByPriorityDesc(id);
    },
  },
  {
    table: 'product_feature_screenshots',
    parent: 'feature_id',
    value: 'image_alt',
    fields: {
      product_id: 'product-a',
      image_url: 'https://example.com/feature.png',
    },
    reader: (db: Drizzle) => {
      const repository = new PostgresqlProductFeatureScreenshotRepository(db);
      return (id: string) => repository.findManyByFeatureIdSortByPriorityDesc(id);
    },
  },
  {
    table: 'alternative_products',
    parent: 'product_id',
    value: 'alternative_product_id',
    fields: {},
    reader: (db: Drizzle) => {
      const repository = new PostgresqlAlternativeProductRepository(db);
      return (id: string) => repository.findManyByProductId(id);
    },
  },
];

suite('상품 상세의 요청 간 최신성 (PRODUCT_DETAIL_TEST_DATABASE_URL 필요)', () => {
  let reader: Sql;
  let writer: Sql;
  let db: Drizzle;
  let selectCount = 0;
  let selectQueries: string[] = [];
  async function openFixtureConnection(
    options: Pick<postgres.Options<Record<string, never>>, 'prepare' | 'connect_timeout' | 'connection'>
  ) {
    const target = new URL(url!);
    const database = 'darun_detail_freshness';
    if (
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== `/${database}` ||
      target.search
    ) {
      throw new Error('Requires the isolated local darun_detail_freshness database without startup options');
    }
    const username = decodeURIComponent(target.username);
    const password = decodeURIComponent(target.password);
    if (!username || [username, password].some(value => /\p{Cc}/u.test(value))) {
      throw new Error('Product detail tests require an explicit database user and valid credentials');
    }
    const session = postgres({
      ...options,
      host: target.hostname,
      port: target.port ? Number(target.port) : 5432,
      database,
      username,
      password,
      max: 1,
      connection: { ...options.connection, search_path: 'public' },
    });
    try {
      const [current] = await session`select current_database() as name, current_schema() as schema`;
      if (current?.name !== database || current.schema !== 'public') {
        throw new Error('Product detail test fixture connected to the wrong database or schema');
      }
      return session;
    } catch (error) {
      await session.end({ timeout: 5 });
      throw error;
    }
  }

  beforeAll(async () => {
    writer = await openFixtureConnection({ connect_timeout: 5 });
    reader = await openFixtureConnection({ connect_timeout: 5 });
    await migrate(drizzle(writer), {
      migrationsFolder: resolve(__dirname, '../scripts/migrations'),
    });
    db = drizzle(reader, {
      logger: {
        logQuery: query => {
          if (/^select /i.test(query)) {
            selectCount++;
            selectQueries.push(query);
          }
        },
      },
    });
  }, 30000);
  beforeEach(() => {
    selectCount = 0;
    selectQueries = [];
  });
  afterAll(async () => {
    if (reader) await reader.end({ timeout: 5 });
    if (writer) await writer.end({ timeout: 5 });
  });

  it('발행 검토가 저장 상태를 구분하고 검토 이후의 수정은 발행 전에 다시 확인하게 한다', async () => {
    const id = randomUUID().replaceAll('-', '').slice(0, 26);
    const slug = `publish-review-${id}`;
    const categoryId = `cat-${id.slice(4)}`;
    const otherId = `other-${id.slice(6)}`;
    const repository = new PostgresqlProductRepository(db);
    const translations = new PostgresqlTranslationRepository(db);
    const translationDb = drizzle(reader);
    const reviewResolver = new AdminProductPublishReviewResolver(new PostgresqlProductPublishReview(db), translationDb);
    const mutationResolver = Object.assign(Object.create(ProductMutationResolver.prototype), {
      getProductUseCase: new GetProduct(repository),
      editProductUseCase: new EditProduct(repository),
      publishProductUseCase: new PublishProduct(repository),
    });
    const server = new ApolloServer({
      schema: buildSchemaSync({
        resolvers: [AdminProductPublishReviewResolver, ProductMutationResolver],
        authChecker: createAuthChecker(),
        container: {
          get: resolver => (resolver === AdminProductPublishReviewResolver ? reviewResolver : mutationResolver),
        },
      }),
      formatError: (formatted, error) => formatServerError(formatted, error, false),
    });
    const run = async (
      document: GraphQL.DocumentNode,
      variables: Record<string, unknown>,
      roles: string[] = ['admin']
    ) => {
      const result = await server.executeOperation(
        { query: print(document), variables },
        { contextValue: { getRoles: async () => roles } }
      );
      if (result.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
      return result.body.singleResult;
    };
    const read = (roles?: string[]) => run(AdminProductPublishReviewDocument, { slug }, roles);
    const publish = (reviewToken?: unknown, roles?: string[]) =>
      run(PublishProductOnPublishProductButtonDocument, { input: { slug, reviewToken } }, roles);
    const effects = async () => ({
      intents: await writer`select kind from product_content_sync_intents where product_id = ${id} order by kind`,
      jobs: await writer`select status from translation_jobs where entity_id = ${id}`,
    });

    await server.start();
    Container.set(ProductContentSyncRegistrarToken, {
      register: registerProductContentSync,
    });
    try {
      await writer`insert into products (id, slug, name, summary, description, logo_url)
        values (${id}, ${slug}, '검토 서비스', '원문 요약', '<style>p { color: red }</style><h2></h2><blockquote><p>&#x2002;</p></blockquote>', ''),
               (${otherId}, ${otherId}, '다른 서비스', '', null, '')`;
      await writer`insert into categories (id, slug, label_ko, label_en)
        values (${categoryId}, ${categoryId}, '검토 분류', 'Review category')`;
      await writer`insert into product_screenshots (id, product_id, image_url, image_alt)
        values (${otherId}, ${otherId}, '/other.png', '다른 서비스 화면')`;
      await writer`insert into product_links (id, product_id, title, icon_url, link, display_link)
        values (${id}, ${id}, '공식 사이트', '', 'https://example.com', 'example.com')`;
      const nameHash = createHash('sha256').update('검토 서비스').digest('hex');
      await translations.upsert({
        entityType: 'Product',
        entityId: id,
        locale: 'en',
        field: 'name',
        value: 'Review App',
        sourceHash: nameHash,
        model: 'fixture',
        promptVersion: 'fixture',
      });
      await translations.upsert({
        entityType: 'Product',
        entityId: id,
        locale: 'en',
        field: 'summary',
        value: 'Old summary',
        sourceHash: createHash('sha256').update('다른 요약').digest('hex'),
        model: 'fixture',
        promptVersion: 'fixture',
      });

      expect((await read([])).errors?.[0]?.extensions?.code).toBe('UNAUTHORIZED');
      const first = await read();
      expect(first.errors).toBeUndefined();
      expect(first.data?.adminProductPublishReview).toMatchObject({
        publishedAt: null,
        hasName: true,
        hasSummary: true,
        hasDescription: false,
        hasCategory: false,
        hasLogo: false,
        hasScreenshot: false,
        officialLinkStatus: 'UNCLASSIFIED',
        translation: {
          name: { status: 'CURRENT', sourceHash: nameHash },
          summary: { status: 'STALE', sourceHash: createHash('sha256').update('원문 요약').digest('hex') },
          description: { status: 'NOT_NEEDED', sourceHash: null },
          latestJobFailed: false,
        },
      });
      expect(await effects()).toEqual({ intents: [], jobs: [] });
      const oldToken = (first.data?.adminProductPublishReview as { reviewToken: string }).reviewToken;
      expect((await publish(oldToken, [])).errors?.[0]?.extensions?.code).toBe('UNAUTHORIZED');
      const logoUrl = 'https://example.com/review.png';
      const edited = await run(EditProductOnEditProductInfoDocument, { slug, input: { logoUrl } });
      expect(edited.errors).toBeUndefined();
      expect(edited.data?.editProduct).toMatchObject({ product: { id, logoUrl } });
      const stale = await publish(oldToken);
      expect(stale.errors?.[0]?.extensions?.code).toBe('product/publish-review-changed');
      expect(await effects()).toEqual({ intents: [], jobs: [] });

      const failure = vi.spyOn(translationDb, 'transaction').mockRejectedValueOnce(new Error('fixture unavailable'));
      const partial = await read();
      failure.mockRestore();
      expect(partial.errors?.[0]?.path).toEqual(['adminProductPublishReview', 'translation']);
      expect(partial.data?.adminProductPublishReview).toMatchObject({
        hasLogo: true,
        translation: null,
      });
      const logoToken = (partial.data?.adminProductPublishReview as { reviewToken: string }).reviewToken;

      await new PostgresqlProductLinkRepository(db).updateById(id, id, link => {
        link.update({ role: 'official' });
        return link;
      });
      expect((await publish(logoToken)).errors?.[0]?.extensions?.code).toBe('product/publish-review-changed');
      const [draft] = await writer`select published_at from products where id = ${id}`;
      expect(draft.published_at).toBeNull();
      expect(await effects()).toEqual({ intents: [], jobs: [] });

      const [{ pid }] = await reader`select pg_backend_pid() as pid`;
      const concurrentSummary = '다른 관리자가 저장한 요약';
      const updatedLogoUrl = 'https://example.com/updated.png';
      let logoEdit: ReturnType<typeof run> | undefined;
      try {
        await writer.begin(async tx => {
          await tx`update products set summary = ${concurrentSummary}, content_revision = content_revision + 1
            where id = ${id}`;
          logoEdit = run(EditProductOnEditProductInfoDocument, { slug, input: { logoUrl: updatedLogoUrl } });
          void logoEdit.catch(() => undefined);
          await expect
            .poll(async () => {
              await tx`select pg_stat_clear_snapshot()`;
              const [connection] = await tx`select wait_event_type from pg_stat_activity where pid = ${pid}`;
              return connection?.wait_event_type;
            })
            .toBe('Lock');
        });
        const savedLogo = await logoEdit;
        expect(savedLogo?.errors).toBeUndefined();
        expect(savedLogo?.data?.editProduct).toMatchObject({
          product: { id, summary: concurrentSummary, logoUrl: updatedLogoUrl },
        });
      } finally {
        await Promise.allSettled([logoEdit]);
      }

      await repository.replaceCategoryIds(id, [categoryId]);
      await writer`insert into product_screenshots (id, product_id, image_url, image_alt)
        values (${id}, ${id}, '/review.png', '검토 서비스 화면')`;
      const description = '<p><img src="/fixture.png" alt=""></p>';
      const media = await run(EditProductOnEditProductInfoDocument, { slug, input: { description } });
      expect(media.errors).toBeUndefined();
      await writer`insert into translation_jobs (id, entity_type, entity_id, locale, status)
        values (${id}, 'Product', ${id}, 'en', 'failed')`;
      const fresh = await read();
      expect(fresh.errors).toBeUndefined();
      expect(fresh.data?.adminProductPublishReview).toMatchObject({
        officialLinkStatus: 'READY',
        hasDescription: true,
        hasCategory: true,
        hasScreenshot: true,
        translation: {
          description: {
            status: 'MISSING',
            sourceHash: `document:v1:${createHash('sha256').update(description).digest('hex')}`,
          },
          latestJobFailed: true,
        },
      });
      const newToken = (fresh.data?.adminProductPublishReview as { reviewToken: string }).reviewToken;
      expect(newToken).not.toBe(oldToken);
      const result = await publish(newToken);
      expect(result.errors).toBeUndefined();
      expect(result.data?.publishProduct).toEqual({
        product: { id, publishedAt: expect.any(String) },
      });
      const retry = await publish(newToken);
      expect(retry.errors).toBeUndefined();
      expect(retry.data).toEqual(result.data);
      const published = await effects();
      expect(published.intents).toEqual([{ kind: 'search' }, { kind: 'translation' }]);
      expect(published.jobs.map(({ status }) => status).sort()).toEqual(['failed', 'pending']);
    } finally {
      await server.stop();
      Container.remove(ProductContentSyncRegistrarToken);
      await writer`delete from product_content_sync_intents where product_id = ${id}`;
      await writer`delete from translation_jobs where entity_id = ${id}`;
      await writer`delete from translations where entity_id = ${id}`;
      await writer`delete from product_links where product_id = ${id}`;
      await writer`delete from product_screenshots where product_id in (${id}, ${otherId})`;
      await writer`delete from products where id in (${id}, ${otherId})`;
      await writer`delete from categories where id = ${categoryId}`;
    }
  });

  it('관리자 분류 변경을 공개 목록과 추천 후보에 반영하고 실패 시 원자적으로 되돌린다', async () => {
    const productId = '764-category-product';
    const slug = '764-product-slug';
    const [a, b, c] = ['764-cat-a', '764-cat-b', '764-cat-c'] as const;
    const categorySlug = (id: string) => `${id}-slug`;
    const productRepository = new PostgresqlProductRepository(db);
    const categoryRepository = new PostgresqlCategoryRepository(db);
    const adminResolver = new AdminProductCategoriesResolver(
      new GetProduct(productRepository),
      new GetCategories(categoryRepository),
      new UpdateProductCategories(productRepository)
    );
    const publicResolver = Object.assign(Object.create(ProductQueryResolver.prototype), {
      getProductsByCategoryUseCase: new GetProductsByCategory(productRepository, categoryRepository),
    });
    const server = new ApolloServer({
      schema: buildSchemaSync({
        resolvers: [AdminProductCategoriesResolver, ProductQueryResolver],
        authChecker: createAuthChecker(),
        container: {
          get: resolver => (resolver === AdminProductCategoriesResolver ? adminResolver : publicResolver),
        },
      }),
      formatError: (formatted, error) => formatServerError(formatted, error, false),
    });
    const run = async (query: string, variables: Record<string, unknown>, roles: string[] = ['admin']) => {
      const result = await server.executeOperation(
        { query, variables },
        { contextValue: { getRoles: async () => roles } }
      );
      if (result.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
      return result.body.singleResult;
    };
    const adminQuery = print(AdminProductCategorySelectionOnProductDetailCategorySectionDocument);
    const mutation = print(UpdateProductCategoriesOnProductDetailCategorySectionDocument);
    const categoryQuery = 'query($slug: String!) { productsByCategory(slug: $slug) { edges { node { id } } } }';
    const expectMembership = async (categoryId: string, isMember: boolean) => {
      const result = await run(categoryQuery, { slug: categorySlug(categoryId) }, []);
      expect(result.errors).toBeUndefined();
      expect(result.data?.productsByCategory).toEqual({
        edges: isMember ? [{ node: { id: productId } }] : [],
      });
      const candidates = await productRepository.findPublishedByCategoryIdAndLimit(categoryId, 30);
      expect(candidates.map(product => product.id)).toEqual(isMember ? [productId] : []);
    };
    const intents = () => writer`select kind, source_revision from product_content_sync_intents
      where product_id = ${productId} order by source_revision`;
    const storedProduct = async () => {
      const [row] =
        await writer`select id, slug, description, category_ids, content_revision from products where id = ${productId}`;
      return row;
    };
    const previousRegistrar = Container.has(ProductContentSyncRegistrarToken)
      ? Container.get(ProductContentSyncRegistrarToken)
      : undefined;
    let failRegistration = false;
    Container.set(ProductContentSyncRegistrarToken, {
      register: async (...args: Parameters<typeof registerProductContentSync>) => {
        await registerProductContentSync(...args);
        if (failRegistration) throw new Error('fixture failed before commit');
      },
    });
    vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'category-membership-fixture-secret');
    try {
      await server.start();
      await writer`insert into categories (id, slug, label_ko, label_en) values
        (${a}, ${categorySlug(a)}, '분류 A', 'Category A'),
        (${b}, ${categorySlug(b)}, '분류 B', 'Category B'),
        (${c}, ${categorySlug(c)}, '분류 C', 'Category C')`;
      await writer`insert into products (id, slug, name, summary, description, logo_url, category_ids, published_at)
        values (${productId}, ${slug}, 'Category fixture', 'summary', 'description', '',
          ${JSON.stringify([a, b])}::json, now())`;
      await writer`insert into tags (id, name, type) values (${productId}, '764-fixture-tag', 'Simple')`;
      await writer`insert into product_tags (id, product_id, tag_id) values (${productId}, ${productId}, ${productId})`;
      const before = await storedProduct();
      const initial = await run(adminQuery, { slug });
      expect(initial.errors).toBeUndefined();
      expect(initial.data?.adminProductCategorySelection).toMatchObject({
        productId,
        categoryIds: [a, b],
        categories: expect.arrayContaining([{ id: c, slug: categorySlug(c), labelKo: '분류 C' }]),
      });
      for (const denied of [
        await run(adminQuery, { slug }, []),
        await run(mutation, { productId, categoryIds: [c] }, []),
      ]) {
        expect(denied.errors?.[0]?.extensions?.code).toBe('UNAUTHORIZED');
      }
      const missing = await run(mutation, {
        productId,
        categoryIds: [a, '764-missing'],
      });
      expect(missing.errors?.[0]?.extensions?.code).toBe('product/category-not-found');
      expect(await storedProduct()).toEqual(before);
      expect(await intents()).toEqual([]);
      await expectMembership(b, true);
      await expectMembership(c, false);

      const updated = await run(mutation, {
        productId,
        categoryIds: [a, c, a],
      });
      expect(updated.errors).toBeUndefined();
      expect(updated.data?.updateProductCategories).toEqual([a, c]);
      const saved = await storedProduct();
      expect(saved).toEqual({
        ...before,
        category_ids: [a, c],
        content_revision: '1',
      });
      expect(await writer`select tag_id from product_tags where product_id = ${productId}`).toEqual([
        { tag_id: productId },
      ]);
      expect((await run(adminQuery, { slug })).data?.adminProductCategorySelection).toMatchObject({
        categoryIds: [a, c],
      });
      await expectMembership(a, true);
      await expectMembership(b, false);
      await expectMembership(c, true);

      const reordered = await run(mutation, {
        productId,
        categoryIds: [c, a],
      });
      expect(reordered.data?.updateProductCategories).toEqual([a, c]);
      failRegistration = true;
      const rolledBack = await run(mutation, { productId, categoryIds: [] });
      expect(rolledBack.errors?.[0]?.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
      expect(await storedProduct()).toEqual(saved);
      expect(await intents()).toEqual([{ kind: 'search', source_revision: '1' }]);

      failRegistration = false;
      const cleared = await run(mutation, { productId, categoryIds: [] });
      expect(cleared.data?.updateProductCategories).toEqual([]);
      await expectMembership(a, false);
      await expectMembership(c, false);
      expect(await intents()).toEqual([
        { kind: 'search', source_revision: '1' },
        { kind: 'search', source_revision: '2' },
      ]);
    } finally {
      await server.stop();
      await writer`delete from product_content_sync_intents where product_id = ${productId}`;
      await writer`delete from product_tags where product_id = ${productId}`;
      await writer`delete from tags where id = ${productId}`;
      await writer`delete from products where id = ${productId}`;
      await writer`delete from categories where id in (${a}, ${b}, ${c})`;
      if (previousRegistrar) Container.set(ProductContentSyncRegistrarToken, previousRegistrar);
      else Container.remove(ProductContentSyncRegistrarToken);
      vi.unstubAllEnvs();
    }
  });

  it('관리자 스크린샷 분류를 일괄 조회하고 저장·해제한 분류를 공개 필터에 반영한다', async () => {
    const productId = '651-ui-elements';
    const slug = productId;
    const classified = '651-shot-classified';
    const unclassified = '651-shot-unclassified';
    const productRepository = new PostgresqlProductRepository(db);
    const screenshotRepository = new PostgresqlProductScreenshotRepository(db);
    const instances = new Map<unknown, object>([
      [
        ProductQueryResolver,
        Object.assign(Object.create(ProductQueryResolver.prototype), {
          getProductUseCase: new GetProduct(productRepository),
          getPublishedProductUseCase: new GetPublishedProduct(productRepository),
          getProductScreenshotsUseCase: new GetProductScreenshots(screenshotRepository),
        }),
      ],
      [
        ProductMutationResolver,
        Object.assign(Object.create(ProductMutationResolver.prototype), {
          updateProductScreenshotUseCase: new UpdateProductScreenshot(screenshotRepository),
        }),
      ],
      [ScreenshotFieldResolver, new ScreenshotFieldResolver(screenshotRepository)],
      [
        VisualScreenshotQueryResolver,
        new VisualScreenshotQueryResolver(new GetVisualScreenshots(screenshotRepository), undefined!, undefined!),
      ],
    ]);
    const server = new ApolloServer({
      schema: buildSchemaSync({
        resolvers: [
          ProductQueryResolver,
          ProductMutationResolver,
          ScreenshotFieldResolver,
          VisualScreenshotQueryResolver,
        ],
        authChecker: createAuthChecker(),
        container: {
          get: resolver => instances.get(resolver),
        },
      }),
      formatError: (formatted, error) => formatServerError(formatted, error, false),
    });
    const run = async (query: string, variables: Record<string, unknown>, roles: string[] = ['admin']) => {
      const result = await server.executeOperation(
        { query, variables },
        { contextValue: { getRoles: async () => roles } }
      );
      if (result.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
      return result.body.singleResult;
    };
    const adminQuery = `query($slug: String!) { tempProductBySlug(slug: $slug) { screenshots { id uiElements } } }`;
    const update = `mutation($input: UpdateProductScreenshotInput!) { updateProductScreenshot(input: $input) { screenshot { id } } }`;
    const visual = `query($slug: String!, $element: VisualUiElement!) {
      visualScreenshots(productSlug: $slug, uiElements: [$element]) { totalCount edges { node { id } } }
    }`;
    const expectClassifications = async (expected: string[]) => {
      const result = await run(adminQuery, { slug });
      expect(result.errors).toBeUndefined();
      expect(result.data?.tempProductBySlug).toEqual({
        screenshots: [
          { id: classified, uiElements: expected },
          { id: unclassified, uiElements: [] },
        ],
      });
    };
    const expectFiltered = async (element: string, hasMatch: boolean) => {
      const result = await run(visual, { slug, element }, []);
      expect(result.errors).toBeUndefined();
      expect(result.data?.visualScreenshots).toEqual(
        hasMatch ? { totalCount: 1, edges: [{ node: { id: classified } }] } : { totalCount: 0, edges: [] }
      );
    };

    vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'screenshot-classification-test-secret');
    try {
      await server.start();
      // The screenshot mutation uses the production transaction. Keep other metadata stable so this fixture only changes UI elements.
      await writer`insert into products (id, name, slug, summary, logo_url, published_at)
        values (${productId}, 'UI fixture', ${slug}, 'summary', 'https://example.com/logo.png', now())`;
      await writer`insert into product_screenshots (id, product_id, image_url, image_alt) values
        (${classified}, ${productId}, 'https://example.com/screen-a.png', 'screen'),
        (${unclassified}, ${productId}, 'https://example.com/screen-b.png', 'screen')`;
      await writer`insert into product_screenshot_ui_elements (id, screenshot_id, element) values
        ('651-tag-card', ${classified}, 'CARD'), ('651-tag-button', ${classified}, 'BUTTON')`;

      await expectClassifications(['BUTTON', 'CARD']);
      const classificationReads = () =>
        selectQueries.filter(query => query.includes('from "product_screenshot_ui_elements"')).length;
      expect(classificationReads()).toBe(1);
      const denied = await run(adminQuery.replace('tempProductBySlug', 'productBySlug'), { slug }, []);
      expect(denied.errors?.[0]).toMatchObject({
        path: ['productBySlug', 'screenshots', 0, 'uiElements'],
        extensions: { code: 'UNAUTHORIZED' },
      });
      expect(classificationReads()).toBe(1);

      const input = { id: classified, imageAlt: 'screen' };
      expect((await run(update, { input })).errors).toBeUndefined();
      await expectClassifications(['BUTTON', 'CARD']);
      await expectFiltered('BUTTON', true);
      expect(
        (
          await run(update, {
            input: { ...input, uiElements: ['CARD', 'SEARCH_BAR'] },
          })
        ).errors
      ).toBeUndefined();
      await expectClassifications(['CARD', 'SEARCH_BAR']);
      await expectFiltered('BUTTON', false);
      await expectFiltered('SEARCH_BAR', true);
      expect((await run(update, { input: { ...input, uiElements: [] } })).errors).toBeUndefined();
      await expectClassifications([]);
      await expectFiltered('SEARCH_BAR', false);
    } finally {
      vi.unstubAllEnvs();
      await server.stop();
      await writer`delete from product_screenshots where product_id = ${productId}`;
      await writer`delete from products where id = ${productId}`;
    }
  });

  describe('관리자 상품 목록의 양방향 페이지 경계', () => {
    let server: ApolloServer;
    beforeEach(() => vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'product-pagination-test-secret'));
    beforeAll(async () => {
      const unused = undefined!;
      const resolver = new ProductQueryResolver(
        unused,
        unused,
        new GetAllProducts(new PostgresqlProductRepository(db)),
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused
      );
      // This suite needs its own server; createServer caches the app's singleton.
      server = new ApolloServer({
        schema: buildSchemaSync({
          resolvers: [ProductQueryResolver],
          authChecker: createAuthChecker(),
          container: { get: () => resolver },
        }),
        formatError: (formatted, error) => formatServerError(formatted, error, false),
      });
      await server.start();
    });
    afterAll(async () => {
      if (server) await server.stop();
    });
    afterEach(async () => {
      await writer`delete from products where slug like 'pagination-%'`;
      vi.unstubAllEnvs();
    });
    const run = async (variables: AllProductsOnProductListTableQueryVariables) => {
      const result = await server.executeOperation(
        { query: print(AllProductsOnProductListTableDocument), variables },
        { contextValue: { getRoles: async () => ['admin'] } }
      );
      if (result.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
      expect(result.body.singleResult.errors).toBeUndefined();
      return (result.body.singleResult.data as AllProductsOnProductListTableQuery).allProducts;
    };
    it.each([0, 1, 49, 50, 51, 100, 101])(
      '%i개를 실제 목록 operation으로 누락·중복 없이 앞뒤로 조회한다',
      async count => {
        await writer`delete from products`;
        const ids = Array.from({ length: count }, (_, index) => `page-${String(count - index).padStart(3, '0')}`);
        if (count) {
          await writer`insert into products ${writer(
            [...ids].reverse().map(id => ({
              id,
              slug: `pagination-${id}`,
              name: id,
              summary: '',
              logo_url: '',
            }))
          )}`;
        }
        let page = await run({ first: 50 });
        expect(page.totalCount).toBe(count);
        expect(page.pageInfo.hasPreviousPage).toBe(false);
        const seen = page.edges.map(edge => edge.node.id);
        const pages = [page];
        while (page.pageInfo.hasNextPage) {
          page = await run({ first: 50, after: page.pageInfo.endCursor });
          expect(page.edges.length).toBeGreaterThan(0);
          expect(page.edges.length).toBeLessThanOrEqual(50);
          seen.push(...page.edges.map(edge => edge.node.id));
          pages.push(page);
        }
        expect(seen).toEqual(ids);
        for (let index = pages.length - 2; index >= 0; index--) {
          page = await run({ last: 50, before: page.pageInfo.startCursor });
          expect(page).toEqual(pages[index]);
        }
        expect(page.pageInfo.hasPreviousPage).toBe(false);
        expect(page.edges.map(edge => edge.node.id)).toEqual(ids.slice(0, 50));
        const last = await run({ last: 50 });
        expect(last.edges.map(edge => edge.node.id)).toEqual(ids.slice(-50));
        expect(last.pageInfo).toMatchObject({
          hasNextPage: false,
          hasPreviousPage: count > 50,
        });
      }
    );
  });

  describe('상품 편집 검증과 공개 GraphQL 오류', () => {
    const slugs: string[] = [];
    let server: ApolloServer;
    const previousRegistrar = Container.has(ProductContentSyncRegistrarToken)
      ? Container.get(ProductContentSyncRegistrarToken)
      : undefined;
    let holdRegistration: (() => Promise<void>) | undefined;
    const run = async (
      query: string,
      variables: Record<string, unknown>,
      target = server,
      extensions?: Record<string, unknown>
    ) => {
      const result = await target.executeOperation(
        { query, variables, extensions },
        { contextValue: { getRoles: async () => ['admin'] } }
      );
      if (result.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
      return result.body.singleResult;
    };
    const editingServer = (database: Drizzle) => {
      const repository = new PostgresqlProductRepository(database);
      const getProduct = new GetProduct(repository);
      const mutations = new ProductCoreMutationResolver(
        new CreateProduct(repository),
        new EditProduct(repository),
        undefined as never,
        getProduct,
        undefined as never
      );
      const queries = Object.assign(Object.create(ProductQueryResolver.prototype), { getProductUseCase: getProduct });
      return new ApolloServer({
        schema: buildSchemaSync({
          resolvers: [ProductMutationResolver, ProductQueryResolver],
          authChecker: createAuthChecker(),
          container: { get: type => (type === ProductQueryResolver ? queries : mutations) },
          skipCheck: true,
        }),
        formatError: (formatted, error) => formatServerError(formatted, error, false),
        plugins: [createGraphQLDescriptionPrecondition()],
      });
    };
    beforeAll(async () => {
      Container.set(ProductContentSyncRegistrarToken, {
        register: async (...args: Parameters<typeof registerProductContentSync>) => {
          await registerProductContentSync(...args);
          await holdRegistration?.();
        },
      });
      server = editingServer(db);
      await server.start();
    });
    afterEach(async () => {
      for (const slug of slugs.splice(0)) {
        await writer`delete from product_description_jobs where product_id in (select id from products where slug = ${slug})`;
        await writer`delete from translation_jobs where entity_id in (select id from products where slug = ${slug})`;
        await writer`delete from product_content_sync_intents where product_id in (select id from products where slug = ${slug})`;
        await writer`delete from products where slug = ${slug}`;
      }
    });
    afterAll(async () => {
      if (server) await server.stop();
      if (previousRegistrar) Container.set(ProductContentSyncRegistrarToken, previousRegistrar);
      else Container.remove(ProductContentSyncRegistrarToken);
    });

    it.each(['manual', 'candidate'] as const)(
      '%s 저장 이후 오래된 소개 초안을 거절하고 revision과 동기화 기록을 보존한다',
      async firstWriter => {
        const id = randomUUID().slice(0, 26);
        const slug = `description-${id}`;
        slugs.push(slug);
        const original = '<p>Original introduction</p>';
        const savedDescription = '<p>Newer introduction</p>';
        await writer`insert into products (id, slug, name, summary, description, logo_url, published_at)
          values (${id}, ${slug}, 'Description fixture', '', ${original}, '', now())`;
        const mutation = print(EditProductOnEditProductDescriptionDocument);
        const query = print(TempProductBySlugOnEditProductDescriptionDocument);
        const readDescription = async (target = server) => {
          const result = await run(query, { slug }, target);
          expect(result.errors).toBeUndefined();
          return (result.data?.tempProductBySlug as { description: string | null }).description;
        };
        const base = await readDescription();
        expect(base).toBe(original);
        const save = (description: string, expected: string | null, target = server) =>
          run(
            mutation,
            {
              slug,
              input: { description },
            },
            target,
            {
              darunExpectedDescriptionHash:
                expected === null ? null : createHash('sha256').update(expected).digest('hex'),
            }
          );
        const staleDraft = '<p>Stale draft</p>';
        let staleSave;

        if (firstWriter === 'candidate') {
          const candidateDb = drizzle(writer);
          const evidence = await new PostgresqlProductDescriptionEvidenceAssembler(candidateDb).assemble(id);
          const jobs = new PostgresqlProductDescriptionJobRepository(candidateDb);
          const job = await jobs.createJob({ productId: id });
          const lease = {
            jobId: job.id,
            leaseToken: id,
            leaseUntil: new Date(Date.now() + 60_000),
          };
          await jobs.claimJobLease(lease);
          await jobs.completeJobLease(job.id, lease.leaseToken, 'completed', {
            candidateHtml: savedDescription,
            evidenceHash: evidence.evidenceHash,
            evidenceHashVersion: evidence.evidenceHashVersion,
            baseDescriptionHash: evidence.baseDescriptionHash,
          });
          const apply = new ApplyProductDescriptionCandidate(new PostgresqlProductDescriptionApplyStore(candidateDb));
          expect((await apply.execute({ jobId: job.id })).product.description).toBe(savedDescription);
          staleSave = await save(staleDraft, base);
        } else {
          const applicationName = 'darun-description-competing-editor';
          const secondConnection = await openFixtureConnection({
            connect_timeout: 5,
            connection: { application_name: applicationName },
          });
          const registration = Promise.withResolvers<void>();
          const commit = Promise.withResolvers<void>();
          let secondServer: ReturnType<typeof editingServer> | undefined;
          let firstRequest: ReturnType<typeof save> | undefined;
          let secondRequest: ReturnType<typeof save> | undefined;
          try {
            secondServer = editingServer(drizzle(secondConnection));
            await secondServer.start();
            const secondBase = await readDescription(secondServer);
            expect(secondBase).toBe(original);
            holdRegistration = () => {
              registration.resolve();
              return commit.promise;
            };
            firstRequest = save(savedDescription, base);
            await Promise.race([
              registration.promise,
              firstRequest.then(result => {
                throw new Error(`First save ended before registering sync: ${result.errors?.[0]?.message}`);
              }),
            ]);
            secondRequest = save(staleDraft, secondBase, secondServer);
            await expect
              .poll(async () => {
                const [row] = await writer`select wait_event_type from pg_stat_activity
                  where application_name = ${applicationName}`;
                return row?.wait_event_type;
              })
              .toBe('Lock');
            commit.resolve();
            const firstSave = await firstRequest;
            expect(firstSave.errors).toBeUndefined();
            expect(firstSave.data?.editProduct).toMatchObject({ product: { description: savedDescription } });
            staleSave = await secondRequest;
          } finally {
            commit.resolve();
            await Promise.allSettled([firstRequest, secondRequest]);
            holdRegistration = undefined;
            try {
              await secondServer?.stop();
            } finally {
              await secondConnection.end({ timeout: 5 });
            }
          }
        }

        const product = () => writer`select description, content_revision from products where id = ${id}`;
        const intents = () => writer`select kind, source_revision, status from product_content_sync_intents
          where product_id = ${id} order by source_revision, kind`;
        const jobs = () => writer`select id, status from translation_jobs where entity_id = ${id} order by id`;
        expect(staleSave.errors?.[0]?.extensions?.code).toBe('DESCRIPTION_EDIT_CONFLICT');
        expect(await product()).toEqual([{ description: savedDescription, content_revision: '1' }]);
        expect(await intents()).toEqual([
          { kind: 'search', source_revision: '1', status: 'pending' },
          { kind: 'translation', source_revision: '1', status: 'pending' },
        ]);
        expect(await jobs()).toEqual([{ id: expect.any(String), status: 'pending' }]);
        const malformed = await run(mutation, { slug, input: { description: staleDraft } }, server, {
          darunExpectedDescriptionHash: { unexpected: true },
        });
        expect(malformed.errors?.[0]?.extensions?.code).toBe('INVALID_DESCRIPTION_EDIT_PRECONDITION');
        expect(await product()).toEqual([{ description: savedDescription, content_revision: '1' }]);

        const cleared = await save('', savedDescription);
        expect(cleared.errors).toBeUndefined();
        expect(cleared.data?.editProduct).toMatchObject({
          product: { description: '' },
        });
        expect(await product()).toEqual([{ description: '', content_revision: '2' }]);
      }
    );

    it.each(['a', '한', '😀'])(
      '255개의 %s 문자를 저장하고 초과 입력은 원문·revision·intent를 보존한다',
      async character => {
        const slug = `length-${randomUUID()}`;
        slugs.push(slug);
        const name = character.repeat(255);
        const summary = character.repeat(255);
        const create =
          'mutation($input: CreateProductInput!) { createProduct(input: $input) { product { id name summary } } }';
        const edit =
          'mutation($slug: String!, $input: EditProductInput!) { editProduct(slug: $slug, input: $input) { product { id name summary } } }';
        const input = {
          name,
          summary,
          slug,
          logoUrl: 'https://example.com/logo.png',
        };
        const created = await run(create, { input });
        expect(created.errors).toBeUndefined();
        expect(created.data?.createProduct).toMatchObject({
          product: { name, summary },
        });
        await writer`update products set published_at = now() where slug = ${slug}`;
        const before = await writer`select * from products where slug = ${slug}`;
        const id = before[0].id;
        const intents = await writer`select * from product_content_sync_intents where product_id = ${id} order by id`;
        for (const field of ['name', 'summary']) {
          const oversized = character.repeat(256);
          for (const result of [
            await run(create, {
              input: {
                ...input,
                slug: `${slug}-invalid-${field}`,
                [field]: oversized,
              },
            }),
            await run(edit, { slug, input: { [field]: oversized } }),
          ]) {
            expect(result.errors).toHaveLength(1);
            expect(result.errors?.[0].extensions?.code).toBe('product/invalid-args');
            expect(result.errors?.[0].message).toContain('255');
          }
          expect(await writer`select * from products where slug = ${slug}`).toEqual(before);
          expect(await writer`select * from product_content_sync_intents where product_id = ${id} order by id`).toEqual(
            intents
          );
          expect(await writer`select id from products where slug = ${`${slug}-invalid-${field}`}`).toEqual([]);
        }
        const corrected = await run(edit, {
          slug,
          input: { name: `새${character.repeat(254)}`, summary: '' },
        });
        expect(corrected.errors).toBeUndefined();
        expect((await writer`select name, summary, content_revision from products where id = ${id}`)[0]).toMatchObject({
          name: `새${character.repeat(254)}`,
          summary: '',
          content_revision: '1',
        });
      }
    );
  });

  describe.each(cases)('$table', spec => {
    const seed = async () => {
      await writer`delete from ${writer(spec.table)}`;
      for (const [id, parent, value] of [
        ['row-a', 'parent-a', 'before-a'],
        ['row-b', 'parent-b', 'before-b'],
      ]) {
        const row = {
          ...spec.fields,
          id,
          [spec.parent]: parent,
          [spec.value]: value,
        };
        await writer`insert into ${writer(spec.table)} ${writer(row)}`;
      }
    };
    const valueOf = (row: object) => {
      const fields = row as Record<string, unknown>;
      return fields['title'] ?? fields['name'] ?? fields['imageAlt'] ?? fields['alternativeProductId'];
    };

    it('같은 tick을 배치 조회하고 별도 연결의 commit 후 수정·삭제·빈 목록의 추가를 반영한다', async () => {
      await seed();
      const read = spec.reader(db);
      const batch = () => Promise.all(['parent-b', 'missing', 'parent-a', 'parent-b'].map(read));
      const before = await batch();
      expect(before.map(rows => rows.map(row => row.id))).toEqual([['row-b'], [], ['row-a'], ['row-b']]);
      expect(selectCount).toBe(1);
      await writer.begin(async tx => {
        await tx`update ${tx(spec.table)} set ${tx(spec.value)} = 'after-a' where id = 'row-a'`;
        await tx`delete from ${tx(spec.table)} where id = 'row-b'`;
        const row = {
          ...spec.fields,
          id: 'row-new',
          [spec.parent]: 'missing',
          [spec.value]: 'new-value',
        };
        await tx`insert into ${tx(spec.table)} ${tx(row)}`;
      });
      const after = await batch();
      expect(after.map(rows => rows.map(row => row.id))).toEqual([[], ['row-new'], ['row-a'], []]);
      expect(valueOf(after[2][0])).toBe('after-a');
      expect(valueOf(after[1][0])).toBe('new-value');
      expect(selectCount).toBe(2);
    });

    it('별도 연결의 변경이 rollback되면 기존 값을 유지한다', async () => {
      await seed();
      const read = spec.reader(db);
      expect((await read('parent-a')).map(valueOf)).toEqual(['before-a']);
      await expect(
        writer.begin(async tx => {
          await tx`update ${tx(spec.table)} set ${tx(spec.value)} = 'rolled-back' where id = 'row-a'`;
          await tx`delete from ${tx(spec.table)} where id = 'row-b'`;
          throw new Error('synthetic rollback');
        })
      ).rejects.toThrow('synthetic rollback');
      expect((await read('parent-a')).map(valueOf)).toEqual(['before-a']);
      expect((await read('parent-b')).map(valueOf)).toEqual(['before-b']);
    });
  });

  describe.each(cases.filter(spec => spec.table.includes('screenshots')))('$table 우선순위', spec => {
    it('삽입 순서와 무관하게 priority DESC·id ASC로 정렬하고 여러 부모를 한 번에 조회한다', async () => {
      await writer`delete from ${writer(spec.table)}`;
      for (const [id, parent, priority] of [
        ['a-low', 'parent-a', -1],
        ['b-high', 'parent-b', 9],
        ['a-tie-z', 'parent-a', 5],
        ['b-low', 'parent-b', 0],
        ['a-high', 'parent-a', 10],
        ['a-tie-a', 'parent-a', 5],
      ] as const) {
        const row = {
          ...spec.fields,
          id,
          [spec.parent]: parent,
          [spec.value]: id,
          priority,
          created_at: '2026-01-01T00:00:00Z',
        };
        await writer`insert into ${writer(spec.table)} ${writer(row)}`;
      }

      const read = spec.reader(db);
      const ids = (rows: { id: string }[]) => rows.map(row => row.id);
      const first = await Promise.all(['parent-b', 'missing', 'parent-a', 'parent-b'].map(read));
      expect(first.map(ids)).toEqual([
        ['b-high', 'b-low'],
        [],
        ['a-high', 'a-tie-a', 'a-tie-z', 'a-low'],
        ['b-high', 'b-low'],
      ]);
      expect(selectCount).toBe(1);

      // A physical row update and reversed batch keys must not change equal-priority ordering.
      await writer`update ${writer(spec.table)} set image_alt = 'edited' where id = 'a-tie-a'`;
      const second = await Promise.all(['parent-a', 'parent-b'].map(read));
      expect(second.map(ids)).toEqual([ids(first[2]), ids(first[0])]);
      expect(selectCount).toBe(2);

      await writer`update ${writer(spec.table)} set priority = 11 where id = 'a-low'`;
      expect(ids(await read('parent-a'))).toEqual(['a-low', 'a-high', 'a-tie-a', 'a-tie-z']);
      expect(selectCount).toBe(3);
    });
  });

  describe('영어 기능 번역의 일괄 조회', () => {
    let resolver: ProductQueryResolver;
    let featureTranslationQueries: number[];
    let failTranslation: boolean;
    let run: (locale: string) => Promise<GraphQL.ExecutionResult>;
    const products = ['batch-a', 'batch-b', 'batch-c'].map((id, index) => ({
      id,
      name: `상품 ${index}`,
      slug: id,
      logoUrl: '',
      locale: 'en',
    }));
    const expectedFeatures = (productId: string, locale = 'en') =>
      Array.from({ length: 20 }, (_, index) => ({
        id: `${productId}-${String(index).padStart(2, '0')}`,
        name: locale === 'ko' || index === 2 || index === 19 ? `기능 ${index}` : `Name ${index}`,
        summary:
          index === 0
            ? null
            : index === 1
              ? ''
              : locale === 'ko' || index === 3 || index === 4
                ? `요약 ${index}`
                : `Summary ${index}`,
        emoji: 'x',
      }));

    beforeEach(async () => {
      await writer`delete from product_features`;
      await writer`delete from translations`;
      const featureRows = [];
      const translationRows = [];
      for (const product of products) {
        for (let index = 0; index < 20; index++) {
          const id = `${product.id}-${String(index).padStart(2, '0')}`;
          const summary = index === 0 ? null : index === 1 ? '' : `요약 ${index}`;
          featureRows.push({ id, product_id: product.id, name: `기능 ${index}`, summary, emoji: 'x' });
          for (const field of ['name', 'summary']) {
            if ((field === 'name' && index === 19) || (field === 'summary' && (index === 0 || index === 3))) continue;
            const koreanValue = field === 'name' ? `기능 ${index}` : summary!;
            const sourceHash = computeSourceHash(field === 'name' && index === 2 ? '이전 원문' : koreanValue, field);
            const value =
              field === 'summary' && index === 4
                ? ''
                : field === 'name'
                  ? `Name ${index}`
                  : index === 1
                    ? ''
                    : `Summary ${index}`;
            translationRows.push({
              id: `${id}:${field}`,
              entity_type: 'ProductFeature',
              entity_id: id,
              locale: 'en',
              field,
              value,
              source_hash: sourceHash,
            });
          }
        }
      }
      await writer`insert into product_features ${writer(featureRows)}`;
      await writer`insert into translations ${writer(translationRows)}`;
      featureTranslationQueries = [];
      failTranslation = false;
      const observedDb = drizzle(reader, {
        logger: {
          logQuery: (query, params) => {
            if (query.includes('from "translations"') && params.includes('ProductFeature')) {
              featureTranslationQueries.push(params.length);
              if (failTranslation) throw new Error('synthetic translation read failure');
            }
          },
        },
      });
      const unused = undefined!;
      resolver = new ProductQueryResolver(
        { execute: async () => products } as never,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        unused,
        new GetProductFeatures(new PostgresqlProductFeatureRepository(observedDb)),
        unused,
        unused,
        unused,
        unused,
        unused,
        new TranslationService(new PostgresqlTranslationRepository(observedDb)),
        unused,
        unused
      );
      const schema = buildSchemaSync({
        resolvers: [ProductQueryResolver],
        authChecker: () => true,
        container: { get: () => resolver },
      });
      run = async locale => {
        const result = await graphql({
          schema,
          source: `{
          recentProducts(first: 3, locale: "${locale}") { id features { id name summary emoji } }
        }`,
        });
        if (result.data) {
          const rows = result.data.recentProducts as Array<{
            features: Array<{ id: string }>;
          }>;
          rows.forEach(row => row.features.sort((a, b) => a.id.localeCompare(b.id)));
        }
        return result;
      };
    });

    it('20개 기능은 번역 SQL 1회로 읽고 최신·누락·오래된 hash·빈 요약을 보존한다', async () => {
      const features = await resolver.features(products[0]);
      expect(
        features
          .map(({ id, name, summary, emoji }) => ({ id, name, summary: summary ?? null, emoji }))
          .sort((a, b) => a.id.localeCompare(b.id))
      ).toEqual(expectedFeatures('batch-a'));
      expect(featureTranslationQueries).toHaveLength(1);
    });

    it('실제 GraphQL operation의 여러 상품은 기능 필드를 100개 이하 SQL batch로 합친다', async () => {
      const result = await run('en');
      expect(result.errors).toBeUndefined();
      expect(result.data?.recentProducts).toEqual(
        products.map(product => ({
          id: product.id,
          features: expectedFeatures(product.id),
        }))
      );
      expect(featureTranslationQueries).toHaveLength(2);
      expect(featureTranslationQueries.every(parameterCount => parameterCount <= 400)).toBe(true);
    });

    it('한국어와 빈 기능 목록은 번역 SQL을 실행하지 않는다', async () => {
      const result = await run('ko');
      expect(result.errors).toBeUndefined();
      expect(result.data?.recentProducts).toEqual(
        products.map(product => ({
          id: product.id,
          features: expectedFeatures(product.id, 'ko'),
        }))
      );
      expect(await resolver.features({ ...products[0], id: 'absent' })).toEqual([]);
      expect(featureTranslationQueries).toHaveLength(0);
    });

    it('같은 인스턴스의 다음 요청은 번역 수정·삭제·원문 변경을 다시 읽는다', async () => {
      expect((await resolver.features(products[0])).find(feature => feature.id === 'batch-a-05')?.name).toBe('Name 5');
      await writer`update translations set value = 'Updated name' where entity_id = 'batch-a-05' and field = 'name'`;
      await writer`delete from translations where entity_id = 'batch-a-06' and field = 'name'`;
      await writer`update product_features set name = '바뀐 원문' where id = 'batch-a-07'`;
      const features = await resolver.features(products[0]);
      expect(features.find(feature => feature.id === 'batch-a-05')?.name).toBe('Updated name');
      expect(features.find(feature => feature.id === 'batch-a-06')?.name).toBe('기능 6');
      expect(features.find(feature => feature.id === 'batch-a-07')?.name).toBe('바뀐 원문');
      expect(featureTranslationQueries).toHaveLength(2);
    });

    it('번역 SQL 장애는 전체 항목의 원문으로 fallback하고 다음 요청에서 복구한다', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        failTranslation = true;
        const failed = await run('en');
        expect(failed.errors).toBeUndefined();
        expect(failed.data?.recentProducts).toEqual(
          products.map(product => ({
            id: product.id,
            features: expectedFeatures(product.id, 'ko'),
          }))
        );
        failTranslation = false;
        const recovered = await run('en');
        expect(recovered.errors).toBeUndefined();
        expect(recovered.data?.recentProducts).toEqual(
          products.map(product => ({
            id: product.id,
            features: expectedFeatures(product.id),
          }))
        );
        expect(log).toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    });

    it('같은 tick의 타입·언어·필드를 구분하고 중복 키와 없는 번역을 올바르게 반환한다', async () => {
      await writer`insert into translations (id, entity_type, entity_id, locale, field, value) values
        ('other-type', 'Product', 'batch-a-05', 'en', 'name', 'Product name'),
        ('other-locale', 'ProductFeature', 'batch-a-05', 'fr', 'name', 'Nom')`;
      const repository = new PostgresqlTranslationRepository(db);
      const requests = [
        {
          entityType: 'ProductFeature',
          locale: 'en',
          entities: [
            { entityId: 'batch-a-05', field: 'name' },
            { entityId: 'batch-a-05', field: 'summary' },
            { entityId: 'batch-a-05', field: 'name' },
            { entityId: 'absent', field: 'name' },
          ],
        },
        { entityType: 'Product', locale: 'en', entities: [{ entityId: 'batch-a-05', field: 'name' }] },
        { entityType: 'ProductFeature', locale: 'fr', entities: [{ entityId: 'batch-a-05', field: 'name' }] },
      ];
      const results = await Promise.all(requests.map(request => repository.findMany(request)));
      expect(results.map(rows => rows.map(row => row.value))).toEqual([
        ['Name 5', 'Summary 5'],
        ['Product name'],
        ['Nom'],
      ]);
      expect(selectCount).toBe(1);
      expect(await repository.findMany({ ...requests[0], entities: [] })).toEqual([]);
      expect(selectCount).toBe(1);
    });
  });

  describe('소개 작업의 현재 상품 주소 배치 조회', () => {
    const productRows = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `job-product-${index}`,
        name: `Product ${index}`,
        slug: `current-product-${index}`,
        summary: 'summary',
        logo_url: '',
      }));

    beforeEach(async () => {
      await writer`delete from product_description_jobs`;
      await writer`delete from products where id like 'job-product-%'`;
    });
    afterAll(async () => {
      await writer`delete from product_description_jobs`;
      await writer`delete from products where id like 'job-product-%'`;
    });

    async function fixture(count: number, shared = false) {
      const rows = productRows(shared ? 1 : count);
      await writer`insert into products ${writer(rows)}`;
      const jobs = Array.from({ length: count }, (_, index) => ({
        id: `slug-job-${String(index).padStart(3, '0')}`,
        product_id: rows[shared ? 0 : count - index - 1].id,
        status: 'completed',
        created_at: new Date(Date.parse('2026-10-01T00:00:00Z') + index * 1000).toISOString(),
      }));
      await writer`insert into product_description_jobs ${writer(jobs)}`;
      const getProduct = new GetProduct(new PostgresqlProductRepository(db));
      const service = new ProductDescriptionJobService(
        getProduct,
        {} as never,
        new PostgresqlProductDescriptionJobRepository(db),
        {} as never
      );
      const resolver = new ProductDescriptionQueryResolver(service, {} as never, getProduct);
      const schema = buildSchemaSync({
        resolvers: [ProductDescriptionQueryResolver],
        container: { get: () => resolver },
        authChecker: ({ context }) => context.admin === true,
      });
      const read = () =>
        execute<GetProductDescriptionJobsOnAdminQuery>({
          schema,
          document: GetProductDescriptionJobsOnAdminDocument,
          variableValues: { first: count },
          contextValue: { admin: true },
        });
      return { schema, read, jobs, rows };
    }

    it.each([
      [100, true, 1],
      [100, false, 1],
    ] as const)('%i건의 작업(shared=%s)은 상품 SQL %i회로 주소와 순서를 보존한다', async (count, shared, batches) => {
      const { read, jobs, rows } = await fixture(count, shared);
      const result = await read();
      expect(result.errors).toBeUndefined();
      const byId = new Map(rows.map(row => [row.id, row.slug]));
      expect(result.data?.productDescriptionJobPage.jobs).toEqual(
        [...jobs].reverse().map(job =>
          expect.objectContaining({
            id: job.id,
            productId: job.product_id,
            productSlug: byId.get(job.product_id),
          })
        )
      );
      // One job-list SELECT plus bounded product batches, including repeated IDs.
      expect(selectCount).toBe(1 + batches);
    });

    it('대형 후보 100건의 관리자 목록은 본문을 읽지 않고 표시값·필터·페이지를 유지한다', async () => {
      const { read, jobs } = await fixture(100);
      await writer`update product_description_jobs set
        candidate_document = repeat('document-' || id, 1000),
        candidate_html = repeat('<p>' || id || '</p>', 1000),
        message = 'done-' || id, writer_model = 'writer', reviewer_model = 'reviewer'`;
      const result = await read();
      expect(result.errors).toBeUndefined();
      expect(result.data?.productDescriptionJobPage.jobs).toEqual(
        [...jobs].reverse().map(job =>
          expect.objectContaining({
            id: job.id,
            status: 'completed',
            message: `done-${job.id}`,
            error: null,
            writerModel: 'writer',
            reviewerModel: 'reviewer',
            createdAt: job.created_at,
          })
        )
      );
      const listQuery = selectQueries.find(query => query.includes('from "product_description_jobs"'))!;
      expect(listQuery).not.toContain('"candidate_document"');
      expect(listQuery).not.toContain('"candidate_html"');
      expect(selectCount).toBe(2);
      const repository = new PostgresqlProductDescriptionJobRepository(db);
      const summaries = await repository.findJobs({ limit: 100 });
      const summaryBytes = Buffer.byteLength(JSON.stringify(summaries));
      const [stored] =
        await writer`select sum(octet_length(candidate_document) + octet_length(candidate_html))::int as bytes from product_description_jobs`;
      expect(stored.bytes).toBe(4000000);
      expect(summaryBytes).toBeLessThan(100000);
      console.info({ storedCandidateBytes: stored.bytes, summaryBytes });
      const page = await repository.findJobs({ status: 'completed', limit: 3, offset: 2 });
      expect(page.map(job => job.id)).toEqual(['slug-job-097', 'slug-job-096', 'slug-job-095']);
      expect(page.every(job => !('candidateDocument' in job) && !('candidateHtml' in job))).toBe(true);
      expect(JSON.stringify(page).length).toBeLessThan(5000);
      expect(await repository.findJobs({ status: 'failed', limit: 3 })).toEqual([]);
    });

    it('선택한 후보 HTML은 alias·fragment에서도 100건을 한 SQL로 읽고 다음 요청의 변경을 반영한다', async () => {
      const { schema, jobs } = await fixture(100);
      await writer`update product_description_jobs set
        candidate_document = repeat('document-' || id, 1000),
        candidate_html = repeat('<p>' || id || '</p>', 1000)`;
      const read = (include = true) =>
        graphql({
          schema,
          source: `query($include: Boolean!) {
          productDescriptionJobs(limit: 100) { id ...Candidate }
        } fragment Candidate on ProductDescriptionJob { html: candidateHtml @include(if: $include) }`,
          variableValues: { include },
          contextValue: { admin: true },
        });
      const skipped = await read(false);
      expect(skipped.errors).toBeUndefined();
      expect(selectCount).toBe(1);
      expect(selectQueries.every(query => !query.includes('"candidate_html"'))).toBe(true);
      selectQueries = [];
      selectCount = 0;
      const selected = await read();
      expect(selected.errors).toBeUndefined();
      expect(selected.data?.productDescriptionJobs).toEqual(
        [...jobs].reverse().map(job => ({
          id: job.id,
          html: `<p>${job.id}</p>`.repeat(1000),
        }))
      );
      expect(selectCount).toBe(2);
      expect(selectQueries[1]).toMatch(/^select "id", "candidate_html"/);
      expect(selectQueries.every(query => !query.includes('"candidate_document"'))).toBe(true);
      await writer`update product_description_jobs set candidate_html = null where id = 'slug-job-099'`;
      const current = await read();
      expect(current.errors).toBeUndefined();
      expect((current.data?.productDescriptionJobs as { html: string | null }[])[0].html).toBeNull();
      expect(selectCount).toBe(4);
    });

    it('단건 후보·적용용 reader는 HTML과 문서를 온전히 보존하고 field를 다시 읽지 않는다', async () => {
      const { schema } = await fixture(1);
      const html = '<p>후보 &amp; 본문</p>'.repeat(1000);
      const document = JSON.stringify({ intro: '근거'.repeat(1000), sections: ['first', 'last'] });
      await writer`update product_description_jobs set candidate_html = ${html}, candidate_document = ${document}`;
      const result = await graphql({
        schema,
        source: '{ productDescriptionJob(id: "slug-job-000") { id candidateHtml } }',
        contextValue: { admin: true },
      });
      expect(result.errors).toBeUndefined();
      expect(result.data?.productDescriptionJob).toEqual({ id: 'slug-job-000', candidateHtml: html });
      expect(selectCount).toBe(1);
      expect(await new PostgresqlProductDescriptionJobRepository(db).findJobById('slug-job-000')).toMatchObject({
        candidateHtml: html,
        candidateDocument: document,
      });
    });

    it('후보 배치는 중복·부재와 100개 상한을 보존하고 삭제·재생성을 새로 읽는다', async () => {
      await fixture(1);
      await writer`update product_description_jobs set candidate_html = '<p>first</p>'`;
      const repository = new PostgresqlProductDescriptionJobRepository(db);
      const ids = ['slug-job-000', ...Array.from({ length: 199 }, (_, index) => `missing-${index}`), 'slug-job-000'];
      expect(await Promise.all(ids.map(id => repository.findCandidateHtmlByJobId(id)))).toEqual([
        '<p>first</p>',
        ...Array.from({ length: 199 }, () => null),
        '<p>first</p>',
      ]);
      expect(selectCount).toBe(3);
      await writer`delete from product_description_jobs where id = 'slug-job-000'`;
      expect(await repository.findCandidateHtmlByJobId('slug-job-000')).toBeNull();
      await writer`insert into product_description_jobs (id, product_id, candidate_html) values ('slug-job-000', 'job-product-0', '<p>new</p>')`;
      expect(await repository.findCandidateHtmlByJobId('slug-job-000')).toBe('<p>new</p>');
      expect(selectCount).toBe(5);
    });

    it('후보 field의 DB 오류를 null 성공으로 숨기지 않고 복구 후 다시 읽는다', async () => {
      const { schema } = await fixture(2);
      const read = () =>
        graphql({
          schema,
          source: '{ productDescriptionJobs { id candidateHtml } }',
          contextValue: { admin: true },
        });
      await writer`alter table product_description_jobs rename column candidate_html to unavailable_candidate_html`;
      try {
        const result = await read();
        expect(result.errors).toHaveLength(2);
        expect(result.errors!.map(error => (error.originalError as { code?: string })?.code)).toEqual([
          'database/read-schema-invalid',
          'database/read-schema-invalid',
        ]);
        expect(JSON.stringify(result.errors)).not.toContain('unavailable_candidate_html');
        expect(selectCount).toBe(2);
      } finally {
        await writer`alter table product_description_jobs rename column unavailable_candidate_html to candidate_html`;
      }
      await writer`update product_description_jobs set candidate_html = '<p>recovered</p>'`;
      expect((await read()).errors).toBeUndefined();
      expect(selectCount).toBe(4);
      const denied = await graphql({
        schema,
        source: '{ productDescriptionJobs { candidateHtml } }',
        contextValue: { admin: false },
      });
      expect(denied.errors).toHaveLength(1);
      expect(selectCount).toBe(4);
    });

    it('201개 ID는 최대 100개씩 나누어 읽고 중복·부재 ID의 위치를 보존한다', async () => {
      const rows = productRows(199);
      await writer`insert into products ${writer(rows)}`;
      const ids = [...rows.map(row => row.id).reverse(), 'missing-product', rows[0].id];
      const repository = new PostgresqlProductRepository(db);
      const result = await Promise.all(ids.map(id => repository.findOneById(id)));
      const byId = new Map(rows.map(row => [row.id, row.slug]));
      expect(result.map(product => product?.slug ?? null)).toEqual(ids.map(id => byId.get(id) ?? null));
      expect(selectCount).toBe(3);
    });

    it('같은 warm reader의 다음 요청은 별도 writer의 commit·rollback·삭제·재생성을 반영한다', async () => {
      const { schema, read, rows } = await fixture(1);
      expect((await read()).data?.productDescriptionJobPage.jobs).toEqual([
        expect.objectContaining({ productSlug: 'current-product-0' }),
      ]);
      await writer`update products set slug = 'renamed-product' where id = ${rows[0].id}`;
      expect((await read()).data?.productDescriptionJobPage.jobs).toEqual([
        expect.objectContaining({ productSlug: 'renamed-product' }),
      ]);
      await expect(
        writer.begin(async tx => {
          await tx`update products set slug = 'rolled-back' where id = ${rows[0].id}`;
          throw new Error('synthetic rollback');
        })
      ).rejects.toThrow('synthetic rollback');
      expect((await read()).data?.productDescriptionJobPage.jobs).toEqual([
        expect.objectContaining({ productSlug: 'renamed-product' }),
      ]);
      await writer`delete from products where id = ${rows[0].id}`;
      const missing = await read();
      expect(missing.errors).toHaveLength(1);
      expect(missing.errors![0].message).toBe('소개 후보에 연결된 제품을 찾지 못했습니다.');
      expect(missing.errors![0].path).toEqual(['productDescriptionJobPage', 'jobs', 0, 'productSlug']);
      expect(missing.data).toBeNull();
      await writer`insert into products ${writer({ ...rows[0], slug: 'restored-product' })}`;
      const restored = await read();
      expect(restored.errors).toBeUndefined();
      expect(restored.data?.productDescriptionJobPage.jobs).toEqual([
        expect.objectContaining({ productSlug: 'restored-product' }),
      ]);
      const single = await graphql({
        schema,
        source: '{ productDescriptionJob(id: "slug-job-000") { productSlug } }',
        contextValue: { admin: true },
      });
      expect(single.errors).toBeUndefined();
      expect(single.data?.productDescriptionJob).toEqual({
        productSlug: 'restored-product',
      });
      expect(selectCount).toBe(12);
    });

    it.each(['id', 'id productSlug @skip(if: true)', 'id productSlug @include(if: false)'])(
      '주소를 선택하지 않은 목록(%s)은 상품을 읽지 않는다',
      async fields => {
        const { schema } = await fixture(2);
        const result = await graphql({
          schema,
          source: `{ productDescriptionJobs { ${fields} } }`,
          contextValue: { admin: true },
        });
        expect(result.errors).toBeUndefined();
        expect(result.data?.productDescriptionJobs).toEqual([{ id: 'slug-job-001' }, { id: 'slug-job-000' }]);
        expect(selectCount).toBe(1);
      }
    );

    it('관리자가 아닌 요청은 작업과 상품 SQL 전에 거절한다', async () => {
      const { schema } = await fixture(1);
      const result = await execute({
        schema,
        document: GetProductDescriptionJobsOnAdminDocument,
        contextValue: { admin: false },
      });
      expect(result.errors).toHaveLength(1);
      expect(result.data).toBeNull();
      expect(selectCount).toBe(0);
    });
  });

  describe('상품 대표 링크의 전체 순서', () => {
    beforeEach(async () => {
      await writer`delete from product_links where product_id in ('link-parent-a', 'link-parent-b')`;
      await writer`insert into products (id, name, slug, summary, logo_url) values
        ('link-parent-a', 'Link A', 'link-parent-a', '', ''),
        ('link-parent-b', 'Link B', 'link-parent-b', '', '')`;
      for (const [id, parent, createdAt] of [
        ['a-new', 'link-parent-a', '2026-01-03'],
        ['b-tie-z', 'link-parent-b', '2026-01-01'],
        ['a-tie-z', 'link-parent-a', '2026-01-01'],
        ['b-new', 'link-parent-b', '2026-01-02'],
        ['a-tie-a', 'link-parent-a', '2026-01-01'],
        ['b-tie-a', 'link-parent-b', '2026-01-01'],
      ]) {
        await writer`insert into product_links (id, product_id, title, link, display_link, icon_url, created_at)
          values (${id}, ${parent}, ${id}, ${`https://example.com/${id}`}, ${id}, '', ${createdAt})`;
      }
      selectCount = 0;
    });

    afterEach(async () => {
      await writer`delete from product_content_sync_intents where product_id in ('link-parent-a', 'link-parent-b')`;
      await writer`delete from product_links where product_id in ('link-parent-a', 'link-parent-b')`;
      await writer`delete from products where id in ('link-parent-a', 'link-parent-b')`;
    });

    it('삽입·배치 순서와 제목·URL 수정에 관계없이 createdAt ASC·id ASC 순서를 유지한다', async () => {
      const repository = new PostgresqlProductLinkRepository(db);
      const read = (ids: string[]) => Promise.all(ids.map(id => repository.findManyByProductId(id)));
      const idsOf = (rows: { id: string }[]) => rows.map(row => row.id);
      const first = await read(['link-parent-b', 'missing', 'link-parent-a', 'link-parent-b']);
      expect(first.map(idsOf)).toEqual([
        ['b-tie-a', 'b-tie-z', 'b-new'],
        [],
        ['a-tie-a', 'a-tie-z', 'a-new'],
        ['b-tie-a', 'b-tie-z', 'b-new'],
      ]);
      expect(selectCount).toBe(1);

      await repository.updateById('a-tie-a', 'link-parent-a', link => {
        link.update({ title: 'Edited primary', link: 'https://example.com/edited' });
        return link;
      });
      await writer`update product_links set title = 'Edited secondary' where id = 'b-tie-z'`;
      selectCount = 0;
      const second = await read(['link-parent-a', 'link-parent-b']);
      expect(second.map(idsOf)).toEqual([idsOf(first[2]), idsOf(first[0])]);
      expect(second[0][0]).toMatchObject({ title: 'Edited primary', link: 'https://example.com/edited' });
      expect(selectCount).toBe(1);
    });

    it('관리자와 공개 GraphQL 조회가 같은 첫 링크만 대표로 반환한다', async () => {
      await writer`update products set published_at = '2026-01-01' where id in ('link-parent-a', 'link-parent-b')`;
      const productRepository = new PostgresqlProductRepository(db);
      const resolver = Object.assign(Object.create(ProductQueryResolver.prototype) as ProductQueryResolver, {
        getProductUseCase: new GetProduct(productRepository),
        getPublishedProductUseCase: new GetPublishedProduct(productRepository),
        getProductLinksUseCase: new GetProductLinks(new PostgresqlProductLinkRepository(db)),
      });
      const schema = buildSchemaSync({
        resolvers: [ProductQueryResolver],
        authChecker: () => true,
        container: { get: () => resolver },
      });
      const result = await graphql({
        schema,
        source: `{
          admin: tempProductBySlug(slug: "link-parent-a") { links { id role isPrimary } }
          public: productBySlug(slug: "link-parent-a", locale: "ko") { links { id role isPrimary } }
        }`,
      });
      expect(result.errors).toBeUndefined();
      const expected = {
        links: [
          { id: 'a-tie-a', role: null, isPrimary: true },
          { id: 'a-tie-z', role: null, isPrimary: false },
          { id: 'a-new', role: null, isPrimary: false },
        ],
      };
      expect(result.data).toEqual({ admin: expected, public: expected });
    });

    it('관리자에게만 역할 저장과 대표 교체를 허용하고 공개·관리자에 같은 링크를 반환한다', async () => {
      await writer`update products set published_at = '2026-01-01' where id = 'link-parent-a'`;
      const product = new PostgresqlProductRepository(db);
      const links = new PostgresqlProductLinkRepository(db);
      const getProductUseCase = new GetProduct(product);
      const resolvers = new Map([
        [
          ProductQueryResolver,
          Object.assign(Object.create(ProductQueryResolver.prototype), {
            getProductUseCase,
            getPublishedProductUseCase: new GetPublishedProduct(product),
            getProductLinksUseCase: new GetProductLinks(links),
          }),
        ],
        [
          ProductMutationResolver,
          Object.assign(Object.create(ProductMutationResolver.prototype), {
            getProductUseCase,
            addProductLinkUseCase: new AddProductLink(links),
            updateProductLinkUseCase: new UpdateProductLink(links),
          }),
        ],
      ]);
      const server = new ApolloServer({
        schema: buildSchemaSync({
          resolvers: [ProductQueryResolver, ProductMutationResolver],
          authChecker: createAuthChecker(),
          container: { get: resolver => resolvers.get(resolver) },
        }),
        formatError: (formatted, error) => formatServerError(formatted, error, false),
      });
      const run = async (query: string, variables: Record<string, unknown> = {}, roles = ['admin']) => {
        const result = await server.executeOperation(
          { query, variables },
          { contextValue: { getRoles: async () => roles } }
        );
        if (result.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
        return result.body.singleResult;
      };
      const update = `mutation Link($id: String!, $input: UpdateProductLinkInput!) {
        updateProductLink(slug: "link-parent-a", id: $id, input: $input) { product { id } }
      }`;
      const reads = `{
        admin: tempProductBySlug(slug: "link-parent-a") { links { id title role isPrimary } }
        public: productBySlug(slug: "link-parent-a", locale: "en") { links { id title role isPrimary } }
      }`;
      const previousRegistrar = Container.has(ProductContentSyncRegistrarToken)
        ? Container.get(ProductContentSyncRegistrarToken)
        : undefined;
      Container.set(ProductContentSyncRegistrarToken, {
        register: registerProductContentSync,
      });
      try {
        await writer`update product_links set icon_url = 'https://example.com/a-new.svg' where id = 'a-new'`;
        const vars = {
          id: 'a-new',
          input: { role: 'documentation', makePrimary: true },
        };
        expect((await run(update, vars, [])).errors).toHaveLength(1);
        expect((await run(update, { ...vars, id: 'b-new' })).errors).toMatchObject([
          { extensions: { code: 'product/invalid-args' } },
        ]);
        expect((await run(update, { ...vars, input: { role: 'unrecognized' } })).errors).toHaveLength(1);
        expect(
          await writer`select id from product_links where product_id in ('link-parent-a', 'link-parent-b')
          and (role is not null or is_designated_primary)`
        ).toEqual([]);

        const loadIntents = () => writer`
          select l.kind, l.source_revision, p.content_revision
          from product_content_sync_intents l join products p on l.product_id = p.id
          where p.id = 'link-parent-a' order by l.source_revision`;
        const readMetadata = () =>
          writer`select title, link, display_link, icon_url from product_links where id = 'a-new'`;
        const originalMetadata = [
          {
            title: 'a-new',
            link: 'https://example.com/a-new',
            display_link: 'a-new',
            icon_url: 'https://example.com/a-new.svg',
          },
        ];
        expect((await run(update, { ...vars, input: { role: 'documentation' } })).errors).toBeUndefined();
        expect(await readMetadata()).toEqual(originalMetadata);
        expect(await loadIntents()).toEqual([{ kind: 'search', source_revision: '1', content_revision: '1' }]);
        expect((await run(update, { ...vars, input: { makePrimary: true } })).errors).toBeUndefined();
        expect(await readMetadata()).toEqual(originalMetadata);
        expect(await loadIntents()).toEqual([
          { kind: 'search', source_revision: '1', content_revision: '2' },
          { kind: 'search', source_revision: '2', content_revision: '2' },
        ]);
        expect((await run(update, vars)).errors).toBeUndefined();
        expect(
          (
            await run(update, {
              id: 'a-new',
              input: { title: '공식 홈페이지' },
            })
          ).errors
        ).toBeUndefined();
        expect(
          (
            await run(update, {
              id: 'a-tie-z',
              input: { makePrimary: true, role: 'social' },
            })
          ).errors
        ).toBeUndefined();
        const expected = {
          links: [
            { id: 'a-tie-a', title: 'a-tie-a', role: null, isPrimary: false },
            {
              id: 'a-tie-z',
              title: 'a-tie-z',
              role: 'social',
              isPrimary: true,
            },
            {
              id: 'a-new',
              title: '공식 홈페이지',
              role: 'documentation',
              isPrimary: false,
            },
          ],
        };
        const result = await run(reads);
        expect(result.errors).toBeUndefined();
        expect(result.data).toEqual({ admin: expected, public: expected });
        expect(
          await writer`select kind from product_content_sync_intents where product_id = 'link-parent-a' order by source_revision`
        ).toEqual([{ kind: 'search' }, { kind: 'search' }, { kind: 'search' }, { kind: 'search' }]);

        expect(
          (
            await run(
              `mutation AddLink($input: AddProductLinkInput!) {
              addProductLink(slug: "link-parent-a", input: $input) { product { links { title role isPrimary } } }
            }`,
              {
                input: {
                  role: 'download',
                  title: '',
                  link: 'https://example.com/download',
                  displayLink: 'example.com',
                  iconUrl: '',
                },
              }
            )
          ).data
        ).toMatchObject({
          addProductLink: {
            product: {
              links: expect.arrayContaining([{ title: '', role: 'download', isPrimary: false }]),
            },
          },
        });
      } finally {
        await server.stop();
        if (previousRegistrar) Container.set(ProductContentSyncRegistrarToken, previousRegistrar);
        else Container.remove(ProductContentSyncRegistrarToken);
      }
    });

    it('서로 다른 요청이 대표를 바꿔도 대표는 하나이며 동기화 실패 시 기존 대표와 역할을 보존한다', async () => {
      await writer`update product_links set is_designated_primary = true where id = 'b-new'`;
      const writeLink = new UpdateProductLink(new PostgresqlProductLinkRepository(drizzle(writer)));
      const readLink = new UpdateProductLink(new PostgresqlProductLinkRepository(db));
      await Promise.all([
        writeLink.execute({
          productId: 'link-parent-a',
          linkId: 'a-new',
          makePrimary: true,
        }),
        readLink.execute({
          productId: 'link-parent-a',
          linkId: 'a-tie-z',
          makePrimary: true,
        }),
      ]);
      const readRows = () => writer`select id, role, is_designated_primary from product_links
        where product_id in ('link-parent-a', 'link-parent-b') order by id`;
      const rows = await readRows();
      expect(rows).toHaveLength(6);
      const designated = rows.filter(row => row.is_designated_primary);
      expect(designated).toContainEqual({ id: 'b-new', role: null, is_designated_primary: true });
      const designatedA = designated.filter(row => row.id !== 'b-new');
      expect(designatedA).toHaveLength(1);
      expect(['a-new', 'a-tie-z']).toContain(designatedA[0].id);
      await expect(
        writer`update product_links set is_designated_primary = true where id = 'a-tie-a'`
      ).rejects.toMatchObject({ code: '23505' });

      const [before] = await writer`update products set published_at = '2026-01-01'
        where id = 'link-parent-a' returning content_revision`;
      const previousRegistrar = Container.has(ProductContentSyncRegistrarToken)
        ? Container.get(ProductContentSyncRegistrarToken)
        : undefined;
      Container.set(ProductContentSyncRegistrarToken, {
        register: async (tx, input) => {
          await registerProductContentSync(tx, input);
          throw new Error('fixture registration failure');
        },
      });
      try {
        await expect(
          readLink.execute({
            productId: 'link-parent-a',
            linkId: 'a-tie-a',
            makePrimary: true,
            role: 'official',
          })
        ).rejects.toThrow('fixture registration failure');
        expect(await readRows()).toEqual(rows);
        expect(await writer`select content_revision from products where id = 'link-parent-a'`).toEqual([before]);
        expect(await writer`select id from product_content_sync_intents where product_id = 'link-parent-a'`).toEqual(
          []
        );
      } finally {
        if (previousRegistrar) Container.set(ProductContentSyncRegistrarToken, previousRegistrar);
        else Container.remove(ProductContentSyncRegistrarToken);
      }
    });
  });

  describe('랭킹 후보의 실제 투표 수', () => {
    it('검색 색인을 바꾸지 않아도 다음 재정렬은 별도 연결의 투표 변경·삭제를 한 SQL로 읽는다', async () => {
      await writer`delete from votes`;
      await writer`insert into votes (id, target_id, count) values
        ('search-vote-a', 'search-a', 40), ('search-vote-b', 'search-b', 11),
        ('search-vote-outside', 'outside', 99999)`;
      const now = new Date('2026-01-04T00:00:00Z');
      const candidates = ['a', 'b', 'missing'].map(
        (id, index) =>
          new SearchableProduct({
            id: `search-${id}`,
            slug: `search-${id}`,
            name: id,
            summary: id,
            searchScore: 5,
            votes: [900, 0, 9999][index],
            publishedAt: now,
            sourceRevision: '7',
          })
      );
      const search = {
        index: vi.fn(),
        searchProduct: vi.fn().mockResolvedValue(candidates),
      };
      const useCase = new SearchProduct(
        search,
        new PostgresqlVoteRepository(db),
        new SynonymExpander(),
        new SearchRanker({
          now: () => now,
          nowMilliseconds: () => now.getTime(),
        })
      );
      try {
        expect((await useCase.execute({ query: 'fixture', limit: 2 })).map(p => [p.id, p.votes])).toEqual([
          ['search-a', 40],
          ['search-b', 11],
        ]);
        expect(selectCount).toBe(1);
        await writer`update votes set count = 71 where target_id = 'search-b'`;
        await writer`delete from votes where target_id = 'search-a'`;
        expect((await useCase.execute({ query: 'fixture', limit: 3 })).map(p => [p.id, p.votes])).toEqual([
          ['search-b', 71],
          ['search-a', 0],
          ['search-missing', 0],
        ]);
        expect(selectCount).toBe(2);
        expect(search.index).not.toHaveBeenCalled();
        expect(candidates.map(p => [p.votes, p.searchScore, p.sourceRevision])).toEqual([
          [900, 5, '7'],
          [0, 5, '7'],
          [9999, 5, '7'],
        ]);
      } finally {
        await writer`delete from votes`;
      }
    });

    it('요청한 ID만 한 번에 읽고 별도 연결이 수정·삭제한 투표도 다음 조회에 반영한다', async () => {
      await writer`delete from votes`;
      await writer`insert into votes (id, target_id, count) values
        ('ranking-vote-a', 'ranking-a', 7), ('ranking-vote-b', 'ranking-b', 23),
        ('ranking-vote-outside', 'outside', 999)`;
      const repository = new PostgresqlVoteRepository(db);
      const ids = ['ranking-b', 'missing', 'ranking-a', 'ranking-b'];
      const counts = async () => (await repository.findByTargetIds(ids)).map(row => [row.targetId, row.count]).sort();
      expect(await counts()).toEqual([
        ['ranking-a', 7],
        ['ranking-b', 23],
      ]);
      expect(selectCount).toBe(1);
      await writer`update votes set count = 41 where target_id = 'ranking-a'`;
      await writer`delete from votes where target_id = 'ranking-b'`;
      expect(await counts()).toEqual([['ranking-a', 41]]);
      expect(selectCount).toBe(2);
      expect(await repository.findByTargetIds([])).toEqual([]);
      expect(selectCount).toBe(2);
    });

    it('실제 상품·투표 저장소에서 최신 저득표 상품을 평가하고 새 투표를 캐시 점수에 반영한다', async () => {
      await writer`delete from votes`;
      await writer`insert into products (id, name, slug, summary, logo_url, published_at) values
        ('ranking-old', 'Older', 'ranking-old', 'summary', '', '2026-01-01T00:00:00'),
        ('ranking-recent', 'Recent', 'ranking-recent', 'summary', '', '2026-01-03T22:00:00'),
        ('ranking-zero', 'Zero', 'ranking-zero', 'summary', '', '2026-01-03T23:00:00'),
        ('ranking-hidden', 'Hidden', 'ranking-hidden', 'summary', '', null)`;
      try {
        await writer`insert into votes (id, target_id, count) values
          ('ranking-vote-old', 'ranking-old', 100), ('ranking-vote-recent', 'ranking-recent', 5),
          ('ranking-vote-hidden', 'ranking-hidden', 1000)`;
        const voteRepository = new PostgresqlVoteRepository(db);
        const batch = vi.spyOn(voteRepository, 'findByTargetIds');
        const now = new Date('2026-01-04T00:00:00Z');
        const ranking = new GetRankedProducts(voteRepository, new PostgresqlProductRepository(db), {
          now: () => now,
          nowMilliseconds: () => now.getTime(),
        });
        expect((await ranking.execute({ limit: 2 })).map(product => product.id)).toEqual([
          'ranking-recent',
          'ranking-old',
        ]);
        expect(batch).toHaveBeenCalledExactlyOnceWith(['ranking-old', 'ranking-recent', 'ranking-zero']);
        await writer`update votes set count = 0 where target_id = 'ranking-recent'`;
        expect((await ranking.execute({ limit: 2 })).map(product => product.id)).toEqual([
          'ranking-old',
          'ranking-zero',
        ]);
        expect(batch).toHaveBeenCalledTimes(2);
      } finally {
        await writer`delete from products where id in ('ranking-old', 'ranking-recent', 'ranking-zero', 'ranking-hidden')`;
        await writer`delete from votes`;
      }
    });
  });

  describe('Visual 조회의 rolling 24시간 중복 제외', () => {
    let first: Sql;
    let second: Sql;
    const applicationName = `visual-view-${randomUUID()}`;
    const viewerHash = 'a'.repeat(64);
    const targetId = '01K00000000000000000000479';
    const otherTargetId = '01K00000000000000000000480';
    const initialTime = Date.parse('2030-01-01T23:59:00.000Z');

    beforeAll(async () => {
      const options = {
        prepare: false,
        connection: {
          application_name: applicationName,
          statement_timeout: 5000,
          lock_timeout: 4000,
        },
      };
      first = await openFixtureConnection(options);
      second = await openFixtureConnection(options);
      await writer`insert into products (id, name, slug, summary, logo_url)
        values (${targetId}, 'Visual fixture', ${applicationName}, 'summary', 'https://example.com/logo.png')`;
      for (const id of [targetId, otherTargetId]) {
        await writer`insert into product_screenshots (id, product_id, image_url, image_alt)
          values (${id}, ${targetId}, 'https://example.com/screen.png', 'screen')`;
        await writer`insert into product_flows (id, product_id, title, platform, flow_type)
          values (${id}, ${targetId}, 'flow', 'WEB', 'OTHER')`;
      }
    });
    afterAll(async () => {
      vi.restoreAllMocks();
      await first?.end({ timeout: 5 });
      await second?.end({ timeout: 5 });
      await writer`delete from products where id = ${targetId}`;
      await writer`delete from product_screenshots where id in (${targetId}, ${otherTargetId})`;
    });

    const targets = [
      {
        kind: 'screenshot',
        record: (connection: Sql, id = targetId, hash = viewerHash) =>
          new PostgresqlProductScreenshotRepository(drizzle(connection)).insertVisualViewEvent({
            screenshotId: id,
            viewerHash: hash,
          }),
      },
      {
        kind: 'flow',
        record: (connection: Sql, id = targetId, hash = viewerHash) =>
          new PostgresqlProductFlowRepository(drizzle(connection)).insertVisualViewEvent({
            flowId: id,
            viewerHash: hash,
          }),
      },
    ];

    async function waitForBlockedRequests(count: number) {
      await vi.waitFor(
        async () => {
          const [row] = await reader`select count(*)::int as count from pg_stat_activity
            where application_name = ${applicationName} and wait_event = 'advisory'`;
          expect(row.count).toBe(count);
        },
        { timeout: 2000, interval: 10 }
      );
    }

    describe.each(targets)('$kind', target => {
      beforeEach(async () => {
        await writer`delete from visual_view_events`;
        vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      });

      it('별도 연결의 동시 최초 요청은 한 건만 기록한다', async () => {
        // Hold both INSERTs after their duplicate SELECTs on the unfixed code.
        // On the fixed code the second request instead waits on the viewer/target lock.
        await writer`create or replace function visual_view_test_gate() returns trigger language plpgsql as $$
          begin perform pg_advisory_xact_lock(479, 1); return new; end $$`;
        await writer`create trigger visual_view_test_gate before insert on visual_view_events
          for each row execute function visual_view_test_gate()`;
        await writer`select pg_advisory_lock(479, 1)`;
        const requests = [target.record(first), target.record(second)];
        // Attach a rejection handler immediately, including on assertion failure.
        const settled = Promise.allSettled(requests);
        try {
          await waitForBlockedRequests(2);
        } finally {
          await writer`select pg_advisory_unlock(479, 1)`;
          await settled;
          await writer`drop trigger visual_view_test_gate on visual_view_events`;
          await writer`drop function visual_view_test_gate()`;
        }
        expect(await Promise.all(requests)).toEqual(expect.arrayContaining([true, false]));
        const events = await writer`select viewer_hash, screenshot_id, flow_id from visual_view_events`;
        expect(events).toEqual([
          {
            viewer_hash: viewerHash,
            screenshot_id: target.kind === 'screenshot' ? targetId : null,
            flow_id: target.kind === 'flow' ? targetId : null,
          },
        ]);
      });

      it('날짜가 바뀌어도 24시간 직전과 정확한 경계는 제외하고 경계 이후 기록한다', async () => {
        expect(await target.record(first)).toBe(true);
        for (const elapsed of [2 * 60_000, 86_399_999, 86_400_000]) {
          vi.mocked(Date.now).mockReturnValue(initialTime + elapsed);
          expect(await target.record(second)).toBe(false);
        }
        vi.mocked(Date.now).mockReturnValue(initialTime + 86_400_001);
        expect(await target.record(second)).toBe(true);
        const rows = await writer`select to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') as time
          from visual_view_events order by created_at`;
        expect(rows.map(row => row.time)).toEqual(['2030-01-01T23:59:00.000', '2030-01-02T23:59:00.001']);
      });

      it('잠금 대기 중 24시간을 지나면 잠금을 얻은 시각으로 다시 판단한다', async () => {
        await writer`create or replace function visual_view_test_gate() returns trigger language plpgsql as $$
          begin perform pg_advisory_xact_lock(479, 1); return new; end $$`;
        await writer`create trigger visual_view_test_gate before insert on visual_view_events
          for each row execute function visual_view_test_gate()`;
        await writer`select pg_advisory_lock(479, 1)`;
        const requests = [target.record(first)];
        let settled = Promise.allSettled(requests);
        try {
          await waitForBlockedRequests(1);
          requests.push(target.record(second));
          settled = Promise.allSettled(requests);
          await waitForBlockedRequests(2);
          vi.mocked(Date.now).mockReturnValue(initialTime + 86_400_001);
        } finally {
          await writer`select pg_advisory_unlock(479, 1)`;
          await settled;
          await writer`drop trigger visual_view_test_gate on visual_view_events`;
          await writer`drop function visual_view_test_gate()`;
        }
        expect(await Promise.all(requests)).toEqual([true, true]);
        const rows = await writer`select to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') as time
          from visual_view_events order by created_at`;
        expect(rows.map(row => row.time)).toEqual(['2030-01-01T23:59:00.000', '2030-01-02T23:59:00.001']);
      });

      it('다른 viewer와 대상은 첫 기록의 commit을 기다리지 않고 독립적으로 기록한다', async () => {
        await writer`create or replace function visual_view_test_gate() returns trigger language plpgsql as $$
          begin
            if new.viewer_hash = repeat('a', 64)
              and coalesce(new.screenshot_id, new.flow_id) = '01K00000000000000000000479' then
              perform pg_advisory_xact_lock(479, 1);
            end if;
            return new;
          end $$`;
        await writer`create trigger visual_view_test_gate before insert on visual_view_events
          for each row execute function visual_view_test_gate()`;
        await writer`select pg_advisory_lock(479, 1)`;
        const pending = target.record(first);
        const settled = Promise.allSettled([pending]);
        try {
          await waitForBlockedRequests(1);
          expect(await target.record(second, targetId, 'b'.repeat(64))).toBe(true);
          expect(await target.record(second, otherTargetId)).toBe(true);
        } finally {
          await writer`select pg_advisory_unlock(479, 1)`;
          await settled;
          await writer`drop trigger visual_view_test_gate on visual_view_events`;
          await writer`drop function visual_view_test_gate()`;
        }
        expect(await pending).toBe(true);
        const [row] = await writer`select count(*)::int as count from visual_view_events`;
        expect(row.count).toBe(3);
      });

      it('INSERT 실패를 전파하고 transaction과 잠금을 정리해 재시도할 수 있다', async () => {
        await writer`create or replace function visual_view_test_failure() returns trigger language plpgsql as $$
          begin raise exception 'synthetic view insert failure'; end $$`;
        await writer`create trigger visual_view_test_failure before insert on visual_view_events
          for each row execute function visual_view_test_failure()`;
        try {
          await expect(target.record(first)).rejects.toMatchObject({
            cause: { message: 'synthetic view insert failure' },
          });
        } finally {
          await writer`drop trigger visual_view_test_failure on visual_view_events`;
          await writer`drop function visual_view_test_failure()`;
        }
        expect(await target.record(second)).toBe(true);
        const [row] = await writer`select count(*)::int as count from visual_view_events`;
        expect(row.count).toBe(1);
      });
    });

    it('같은 ID의 화면과 플로는 별도 대상이며 두 저장소의 플로 기록은 같은 정책을 사용한다', async () => {
      await writer`delete from visual_view_events`;
      vi.spyOn(Date, 'now').mockReturnValue(initialTime);
      expect(await targets[0].record(first)).toBe(true);
      expect(await targets[1].record(second)).toBe(true);
      expect(
        await new PostgresqlProductScreenshotRepository(drizzle(first)).insertVisualViewEvent({
          flowId: targetId,
          viewerHash,
        })
      ).toBe(false);
      const [row] = await writer`select count(*)::int as count from visual_view_events`;
      expect(row.count).toBe(2);
    });
  });
  describe('사이트맵의 고정 ID 구간 조회', () => {
    beforeEach(async () => {
      await writer`truncate products cascade`;
      await writer`insert into products (id, slug, name, summary, logo_url, published_at) values
        ('range-90', 'range-90', 'High', '', '', now()),
        ('range-80', 'range-80', 'Upper', '', '', now()),
        ('range-70', 'range-70', 'Draft', '', '', null),
        ('range-60', 'range-60', 'Middle', '', '', now()),
        ('range-40', 'range-40', 'Lower', '', '', now()),
        ('range-20', 'range-20', 'Low', '', '', now())`;
    });
    afterEach(async () => {
      await writer`truncate products cascade`;
    });

    it('실제 GraphQL이 양끝을 포함해 읽고 발행·경계 삭제 후에도 커서로 전진한다', async () => {
      const repository = new PostgresqlProductRepository(db);
      const resolver = Object.assign(Object.create(ProductQueryResolver.prototype) as ProductQueryResolver, {
        getPublishedProductsForSitemapUseCase: new GetPublishedProductsForSitemap(repository),
      });
      const schema = buildSchemaSync({
        resolvers: [ProductQueryResolver],
        authChecker: () => true,
        container: { get: () => resolver },
      });
      const source = `query($after: String) {
        publishedProductsForSitemap(first: 2, after: $after, upperBoundId: "range-80", lowerBoundId: "range-40") { id }
      }`;
      const page = (after?: string) => graphql({ schema, source, variableValues: { after } });
      const first = await page();
      expect(first.errors).toBeUndefined();
      expect(first.data?.publishedProductsForSitemap).toEqual([{ id: 'range-80' }, { id: 'range-60' }]);
      await writer`update products set published_at = now() where id = 'range-70'`;
      const refreshed = await page();
      expect(refreshed.data?.publishedProductsForSitemap).toEqual([{ id: 'range-80' }, { id: 'range-70' }]);
      await writer`delete from products where id in ('range-80', 'range-70')`;
      const next = await page('range-70');
      expect(next.errors).toBeUndefined();
      expect(next.data?.publishedProductsForSitemap).toEqual([{ id: 'range-60' }, { id: 'range-40' }]);
      expect((await page('range-40')).data?.publishedProductsForSitemap).toEqual([]);
    });
  });

  describe('사이트맵 대안 존재 여부의 선택적 batch 조회', () => {
    const sources = Array.from({ length: 100 }, (_, index) => ({
      id: `z-source-${String(index).padStart(3, '0')}`,
      kind: index % 6,
      expected: [true, false, true, true, true, false][index % 6],
    })).reverse();
    let productRepository: PostgresqlProductRepository;
    const queries: string[] = [];
    const existenceQueries = () => queries.filter(query => query.includes('alternative_products'));
    const sitemapSource = readFileSync(resolve(__dirname, '../../service-web/app/sitemap-data.ts'), 'utf8');
    const operation = /gql`(\s*query PublishedProductsForSitemap[\s\S]*?)`/.exec(sitemapSource)![1];
    const execute = (source = operation, variableValues = { first: 100 }) => {
      const resolver = Object.assign(Object.create(ProductQueryResolver.prototype) as ProductQueryResolver, {
        getPublishedProductsForSitemapUseCase: new GetPublishedProductsForSitemap(productRepository),
        productRepository,
      });
      const schema = buildSchemaSync({
        resolvers: [ProductQueryResolver],
        authChecker: () => true,
        container: { get: () => resolver },
      });
      return graphql({ schema, source, variableValues });
    };

    beforeEach(async () => {
      await writer`truncate alternative_products, products, product_tags, tags cascade`;
      const candidates = ['manual-0', 'manual-1', 'manual-2', 'manual-3', 'manual-4', 'manual-5', 'category', 'tag'];
      const productRows = [...candidates, 'draft', ...sources.map(source => source.id)].map(id => {
        const source = sources.find(source => source.id === id);
        return {
          id,
          slug: id,
          name: id,
          summary: '',
          logo_url: '',
          published_at: id === 'draft' ? null : source ? '2025-01-01' : '2026-01-01',
          category_ids: id === 'category' || source?.kind === 3 ? '["shared"]' : '[]',
        };
      });
      const alternativeRows = sources.flatMap(source => {
        const ids =
          source.kind === 0
            ? ['manual-0']
            : source.kind === 1
              ? ['draft']
              : source.kind === 2
                ? candidates.slice(0, 6)
                : [];
        return ids.map((id, index) => ({
          id: `${source.id}-${index}`,
          product_id: source.id,
          alternative_product_id: id,
        }));
      });
      const taggedSources = sources.filter(source => source.kind === 4);
      const tags = taggedSources.map(source => ({
        id: source.id,
        name: source.id,
        type: 'feature',
      }));
      const tagRows = taggedSources.flatMap(source => [
        {
          id: `${source.id}-source`,
          product_id: source.id,
          tag_id: source.id,
        },
        {
          id: `${source.id}-candidate`,
          product_id: 'tag',
          tag_id: source.id,
        },
      ]);
      await writer.begin(async tx => {
        await tx`insert into products ${tx(productRows)}`;
        await tx`insert into tags ${tx(tags)}`;
        await tx`insert into alternative_products ${tx(alternativeRows)}`;
        await tx`insert into product_tags ${tx(tagRows)}`;
      });
      productRepository = new PostgresqlProductRepository(
        drizzle(reader, {
          logger: { logQuery: query => queries.push(query) },
        })
      );
      queries.length = 0;
    });

    afterEach(async () => {
      await writer`truncate alternative_products, products, product_tags, tags cascade`;
    });

    it('실제 PublishedProductsForSitemap의 100개 Boolean을 한 SQL로 계산하고 본문을 읽지 않는다', async () => {
      const result = await execute();
      expect(result.errors).toBeUndefined();
      expect(result.data?.publishedProductsForSitemap).toEqual(
        sources.map(source =>
          expect.objectContaining({
            id: source.id,
            hasAlternatives: source.expected,
          })
        )
      );
      expect(existenceQueries()).toHaveLength(1);
      expect(existenceQueries()[0]).not.toMatch(/description|summary|logo_url/);
      expect(queries).toHaveLength(2); // Product page and the optional existence batch.
    });

    it.each([
      'query($first: Int!) { publishedProductsForSitemap(first: $first) { id } }',
      'query($first: Int!) { publishedProductsForSitemap(first: $first) { id hasAlternatives @skip(if: true) } }',
      'query($first: Int!) { publishedProductsForSitemap(first: $first) { id hasAlternatives @include(if: false) } }',
    ])('필드를 선택하지 않으면 존재 계산 SQL을 실행하지 않는다: %s', async source => {
      const result = await execute(source);
      expect(result.errors).toBeUndefined();
      expect(result.data?.publishedProductsForSitemap).toHaveLength(100);
      expect(existenceQueries()).toHaveLength(0);
      expect(queries).toHaveLength(1);
    });

    it('중복·부재 ID의 순서를 보존하며 100개를 넘는 호출을 bounded batch로 나눈다', async () => {
      const ids = [...sources.map(source => source.id), ...sources.map(source => source.id), 'absent'];
      const result = await Promise.all(ids.map(id => productRepository.hasPublishedAlternatives(id)));
      expect(result).toEqual([
        ...sources.map(source => source.expected),
        ...sources.map(source => source.expected),
        false,
      ]);
      expect(existenceQueries()).toHaveLength(3);
    });

    it('같은 reader의 다음 요청은 공개·태그·관계 변경을 읽고 미존재·미발행·자기 참조를 구분한다', async () => {
      const read = (...ids: string[]) => Promise.all(ids.map(id => productRepository.hasPublishedAlternatives(id)));
      expect(await read('z-source-000', 'z-source-001', 'z-source-004', 'absent')).toEqual([true, false, true, false]);
      await writer`update products set published_at = null where id = 'manual-0'`;
      await writer`update products set published_at = '2026-01-01' where id = 'draft'`;
      await writer`delete from product_tags where product_id = 'tag'`;
      expect(await read('z-source-000', 'z-source-001', 'z-source-004', 'absent')).toEqual([false, true, false, false]);
      await writer`insert into alternative_products (id, product_id, alternative_product_id)
        values ('self', 'z-source-005', 'z-source-005'), ('missing-target', 'z-source-005', 'absent')`;
      expect(await read('z-source-005')).toEqual([false]);
      await writer`update products set published_at = null where id in ('z-source-000', 'z-source-003', 'z-source-004')`;
      await writer`insert into alternative_products (id, product_id, alternative_product_id)
        values ('draft-source', 'z-source-000', 'draft')`;
      expect(await read('z-source-000', 'z-source-003', 'z-source-004')).toEqual([true, false, false]);
    });

    it('최신 50개 밖의 태그 전용 후보는 기존처럼 존재 판정에서 제외한다', async () => {
      await writer`update products set published_at = '2020-01-01' where id = 'tag'`;
      expect(await productRepository.hasPublishedAlternatives('z-source-004')).toBe(false);
    });

    it('SQL 실패를 false로 숨기지 않고 다음 요청에서 다시 조회한다', async () => {
      let fail = true;
      const failingRepository = new PostgresqlProductRepository(
        drizzle(reader, {
          logger: {
            logQuery: () => {
              if (fail) throw new Error('synthetic read failure');
            },
          },
        })
      );
      await expect(failingRepository.hasPublishedAlternatives('z-source-000')).rejects.toThrow(
        'synthetic read failure'
      );
      fail = false;
      expect(await failingRepository.hasPublishedAlternatives('z-source-000')).toBe(true);
    });
  });
});
