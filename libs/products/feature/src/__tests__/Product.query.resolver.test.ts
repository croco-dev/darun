import 'reflect-metadata';

vi.mock('@darun/utils-apollo-server', async importOriginal => {
  const actual = await importOriginal<typeof ApolloServer>();
  return {
    AuthRole: { Admin: 'Admin' },
    Connection: class Connection {},
    ConnectionArgs: class ConnectionArgs {},
    Cursor: actual.Cursor,
    PageInfo: class PageInfo {},
  };
});

vi.mock('typedi', () => ({
  Inject: () => () => {},
  Service: () => () => {},
  Token: class Token {},
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor;
  return {
    Arg: () => () => vi.fn(),
    Args: () => methodDecorator,
    ArgsType: () => () => {},
    Authorized: methodDecorator,
    Field: () => () => {},
    FieldResolver: methodDecorator,
    GraphQLISODateTime: class GraphQLISODateTime {},
    ID: class ID {},
    InputType: () => () => {},
    Int: class Int {},
    Mutation: methodDecorator,
    ObjectType: () => () => {},
    Query: methodDecorator,
    registerEnumType: () => {},
    Resolver: () => () => {},
    Root: () => () => {},
  };
});

import { GetCompany, type CompanyRepository } from '@darun/companies-domain';
import {
  GetAllProducts,
  GetProduct,
  GetProductFeatures,
  GetProductLinks,
  GetProductsByCategory,
  GetProductsCount,
  GetProductScreenshots,
  GetProductTags,
  GetPublishedProduct,
  GetPublishedProductsForSitemap,
  GetRankedProducts,
  GetRecentProducts,
  Product as DomainProduct,
  ProductFeature as DomainProductFeature,
  ProductTag,
  Category,
  Tag,
  type CategoryRepository,
  type ProductFeatureRepository,
  type ProductLinkRepository,
  type ProductRepository,
  type ProductScreenshotRepository,
  type ProductTagRepository,
} from '@darun/products-domain';
import {
  AlternativeProduct,
  GetAlternativeProducts,
  type AlternativeProductRepository,
} from '@darun/recommendation-domain';
import { SearchProduct, type SearchableProductRepository } from '@darun/search-domain';
import { TranslationService, type TranslationRepository, computeSourceHash } from '@darun/translation-domain';
import type * as ApolloServer from '@darun/utils-apollo-server';
import { GetVoteCount, type VoteRepository } from '@darun/voting-domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../graphs/Product';
import { ProductQueryResolver } from '../Product.query.resolver';

type ResolverOverrides = Partial<{
  productRepository: ProductRepository;
  categoryRepository: CategoryRepository;
  getProductFeaturesUseCase: GetProductFeatures;
  getPublishedProductUseCase: GetPublishedProduct;
  getAlternativeProductsUseCase: GetAlternativeProducts;
  translationService: TranslationService;
  getRecentProductsUseCase: GetRecentProducts;
  getProductTagsUseCase: GetProductTags;
  getVoteCountUseCase: GetVoteCount;
  getProductLinksUseCase: GetProductLinks;
  getProductScreenshotsUseCase: GetProductScreenshots;
  getPublishedProductsForSitemapUseCase: GetPublishedProductsForSitemap;
}>;

const createProductRepository = (overrides: Partial<ProductRepository> = {}): ProductRepository => ({
  updateById: vi.fn<ProductRepository['updateById']>(),
  findAllByBeforeIdAndLimit: vi.fn<ProductRepository['findAllByBeforeIdAndLimit']>().mockResolvedValue([]),
  findAllByAfterIdAndLimit: vi.fn<ProductRepository['findAllByAfterIdAndLimit']>().mockResolvedValue([]),
  findPublishedByAfterIdAndLimit: vi.fn<ProductRepository['findPublishedByAfterIdAndLimit']>().mockResolvedValue([]),
  findTopNSortByPublishedAtDesc: vi.fn<ProductRepository['findTopNSortByPublishedAtDesc']>().mockResolvedValue([]),
  findPublishedByIds: vi.fn<ProductRepository['findPublishedByIds']>().mockResolvedValue([]),
  findPublishedOneById: vi.fn<ProductRepository['findPublishedOneById']>().mockResolvedValue(null),
  findOneBySlug: vi.fn<ProductRepository['findOneBySlug']>().mockResolvedValue(null),
  findOneById: vi.fn<ProductRepository['findOneById']>().mockResolvedValue(null),
  findOneFreshById: vi.fn<ProductRepository['findOneFreshById']>().mockResolvedValue(null),
  findPublishedOneBySlug: vi.fn<ProductRepository['findPublishedOneBySlug']>().mockResolvedValue(null),
  findPublishedByCategoryId: vi.fn<ProductRepository['findPublishedByCategoryId']>().mockResolvedValue([]),
  countPublishedByCategoryId: vi.fn().mockResolvedValue(0),
  findVisualApps: vi.fn().mockResolvedValue({ products: [], total: 0 }),
  findVisualAppPreviews: vi.fn().mockResolvedValue([]),
  findVisualAppCover: vi.fn().mockResolvedValue(null),
  countVisualAppScreenshots: vi.fn().mockResolvedValue(0),
  hasPublishedAlternatives: vi.fn().mockResolvedValue(false),
  findPublishedByCategoryIdAndLimit: vi
    .fn<ProductRepository['findPublishedByCategoryIdAndLimit']>()
    .mockResolvedValue([]),
  countPublishedAll: vi.fn<ProductRepository['countPublishedAll']>().mockResolvedValue(0),
  countAll: vi.fn<ProductRepository['countAll']>().mockResolvedValue(0),
  insert: vi.fn<ProductRepository['insert']>().mockResolvedValue(null),
  ...overrides,
});

const createProductFeatureRepository = (
  overrides: Partial<ProductFeatureRepository> = {}
): ProductFeatureRepository => ({
  updateById: vi.fn<ProductFeatureRepository['updateById']>(),
  findOneById: vi.fn<ProductFeatureRepository['findOneById']>().mockResolvedValue(null),
  findManyByProductId: vi.fn<ProductFeatureRepository['findManyByProductId']>().mockResolvedValue([]),
  insert: vi.fn<ProductFeatureRepository['insert']>(),
  ...overrides,
});

const createProductLinkRepository = (): ProductLinkRepository => ({
  insert: vi.fn<ProductLinkRepository['insert']>(),
  findManyByProductId: vi.fn<ProductLinkRepository['findManyByProductId']>().mockResolvedValue([]),
  updateById: vi.fn<ProductLinkRepository['updateById']>(),
});

const createProductTagRepository = (): ProductTagRepository => ({
  upsert: vi.fn<ProductTagRepository['upsert']>(),
  findOneByProductId: vi.fn<ProductTagRepository['findOneByProductId']>().mockResolvedValue(null),
  findByProductIds: vi.fn<ProductTagRepository['findByProductIds']>().mockResolvedValue([]),
});

const createProductScreenshotRepository = (): ProductScreenshotRepository => ({
  findManyByProductIdSortByPriorityDesc: vi
    .fn<ProductScreenshotRepository['findManyByProductIdSortByPriorityDesc']>()
    .mockResolvedValue([]),
  findById: vi.fn<ProductScreenshotRepository['findById']>().mockResolvedValue(null),
  insert: vi.fn<ProductScreenshotRepository['insert']>(),
  deleteById: vi.fn<ProductScreenshotRepository['deleteById']>(),
  deleteWithLock: vi.fn<ProductScreenshotRepository['deleteWithLock']>(),
  updateById: vi.fn<ProductScreenshotRepository['updateById']>(),
  findManyVisualPublishedByFilterAndAfterIdAndLimit: vi
    .fn<ProductScreenshotRepository['findManyVisualPublishedByFilterAndAfterIdAndLimit']>()
    .mockResolvedValue([]),
  findManyVisualPublishedByFilterAndPageAndLimit: vi
    .fn<ProductScreenshotRepository['findManyVisualPublishedByFilterAndPageAndLimit']>()
    .mockResolvedValue([]),
  findVisualPublishedById: vi.fn<ProductScreenshotRepository['findVisualPublishedById']>().mockResolvedValue(null),
  countVisualPublishedByFilter: vi
    .fn<ProductScreenshotRepository['countVisualPublishedByFilter']>()
    .mockResolvedValue(0),
  insertVisualViewEvent: vi.fn<ProductScreenshotRepository['insertVisualViewEvent']>().mockResolvedValue(true),
  toggleVisualSave: vi.fn<ProductScreenshotRepository['toggleVisualSave']>().mockResolvedValue({ saved: true }),
  isVisualSaved: vi.fn<ProductScreenshotRepository['isVisualSaved']>().mockResolvedValue(false),
  findManyVisualSavedScreenshotsByUser: vi.fn().mockResolvedValue({ screenshots: [], totalCount: 0 }),
  replaceScreenshotUiElements: vi
    .fn<ProductScreenshotRepository['replaceScreenshotUiElements']>()
    .mockResolvedValue([]),
  findScreenshotUiElementsByScreenshotIds: vi
    .fn<ProductScreenshotRepository['findScreenshotUiElementsByScreenshotIds']>()
    .mockResolvedValue({}),
  findVisualSavesByUser: vi
    .fn<ProductScreenshotRepository['findVisualSavesByUser']>()
    .mockResolvedValue({ screenshotIds: [], flowIds: [], totalCount: 0 }),
});

const createCompanyRepository = (): CompanyRepository => ({
  findById: vi.fn<CompanyRepository['findById']>().mockResolvedValue(null),
  findAllWithPagination: vi.fn<CompanyRepository['findAllWithPagination']>().mockResolvedValue({ data: [], total: 0 }),
  findByName: vi.fn<CompanyRepository['findByName']>().mockResolvedValue([]),
  insert: vi.fn<CompanyRepository['insert']>().mockResolvedValue(null),
});

const createSearchableProductRepository = (): SearchableProductRepository => ({
  index: vi.fn<SearchableProductRepository['index']>().mockResolvedValue(true),
  searchProduct: vi.fn<SearchableProductRepository['searchProduct']>().mockResolvedValue([]),
});

const createAlternativeProductRepository = (
  overrides: Partial<AlternativeProductRepository> = {}
): AlternativeProductRepository => ({
  replaceByProductId: vi.fn<AlternativeProductRepository['replaceByProductId']>(),
  findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue([]),
  create: vi.fn<AlternativeProductRepository['create']>(),
  deleteMany: vi.fn<AlternativeProductRepository['deleteMany']>().mockResolvedValue(true),
  createMany: vi.fn<AlternativeProductRepository['createMany']>().mockResolvedValue([]),
  ...overrides,
});

const createVoteRepository = (): VoteRepository => ({
  upsertByTargetId: vi.fn<VoteRepository['upsertByTargetId']>(),
  findByTargetId: vi.fn<VoteRepository['findByTargetId']>().mockResolvedValue(null),
  findTopNByVoteCount: vi.fn<VoteRepository['findTopNByVoteCount']>().mockResolvedValue([]),
});

const createCategoryRepository = (): CategoryRepository => ({
  findOneBySlug: vi.fn<CategoryRepository['findOneBySlug']>().mockResolvedValue(null),
  findOneById: vi.fn<CategoryRepository['findOneById']>().mockResolvedValue(null),
  findAll: vi.fn<CategoryRepository['findAll']>().mockResolvedValue([]),
  insert: vi.fn<CategoryRepository['insert']>().mockResolvedValue(null),
  updateById: vi.fn<CategoryRepository['updateById']>(),
});

const createTranslationRepository = (overrides: Partial<TranslationRepository> = {}): TranslationRepository => ({
  findOne: vi.fn<TranslationRepository['findOne']>().mockResolvedValue(null),
  findMany: vi.fn<TranslationRepository['findMany']>().mockResolvedValue([]),
  upsert: vi.fn<TranslationRepository['upsert']>(),
  upsertMany: vi.fn<TranslationRepository['upsertMany']>().mockResolvedValue([]),
  findByEntity: vi.fn<TranslationRepository['findByEntity']>().mockResolvedValue([]),
  ...overrides,
});

const createTranslationService = (repository = createTranslationRepository()) => new TranslationService(repository);

const createTranslationRow = (value: string, sourceHash?: string) => ({
  id: value,
  entityType: 'ProductFeature',
  entityId: value,
  locale: 'en',
  field: 'name',
  value,
  sourceHash,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createProductRoot = (locale: string): Product => ({
  id: 'p1',
  name: 'Product 1',
  slug: 'product-1',
  summary: 'Summary 1',
  logoUrl: 'https://example.com/logo.png',
  locale,
});

const createProductQueryResolver = (overrides: ResolverOverrides = {}) => {
  const productRepository = overrides.productRepository ?? createProductRepository();
  const voteRepository = createVoteRepository();

  return new ProductQueryResolver(
    overrides.getRecentProductsUseCase ?? new GetRecentProducts(productRepository),
    new GetRankedProducts(voteRepository, productRepository),
    new GetAllProducts(productRepository),
    new GetProduct(productRepository),
    overrides.getPublishedProductUseCase ?? new GetPublishedProduct(productRepository),
    overrides.getProductLinksUseCase ?? new GetProductLinks(createProductLinkRepository()),
    overrides.getProductTagsUseCase ?? new GetProductTags(createProductTagRepository()),
    overrides.getProductScreenshotsUseCase ?? new GetProductScreenshots(createProductScreenshotRepository()),
    new GetProductsCount(productRepository),
    overrides.getProductFeaturesUseCase ?? new GetProductFeatures(createProductFeatureRepository()),
    new GetCompany(createCompanyRepository()),
    new SearchProduct(createSearchableProductRepository()),
    overrides.getAlternativeProductsUseCase ?? new GetAlternativeProducts(createAlternativeProductRepository()),
    overrides.getVoteCountUseCase ?? new GetVoteCount(voteRepository),
    new GetProductsByCategory(productRepository, overrides.categoryRepository ?? createCategoryRepository()),
    overrides.translationService ?? createTranslationService(),
    overrides.getPublishedProductsForSitemapUseCase ?? new GetPublishedProductsForSitemap(productRepository),
    productRepository
  );
};

describe('ProductQueryResolver', () => {
  beforeEach(() => vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'category-pagination-test'));
  afterEach(() => vi.unstubAllEnvs());
  it('pages category results without omitting products sharing publication timestamps', async () => {
    const products = ['p3', 'p2', 'p1'].map(
      id =>
        new DomainProduct({
          id,
          name: id,
          slug: id,
          summary: '',
          logoUrl: '',
          publishedAt: new Date('2026-01-01'),
        })
    );
    const repository = createProductRepository({
      findPublishedByCategoryId: vi.fn(async (_category, limit, afterId) =>
        products.filter(product => !afterId || product.id < afterId).slice(0, limit)
      ),
      countPublishedByCategoryId: vi.fn().mockResolvedValue(3),
    });
    const categories = createCategoryRepository();
    vi.mocked(categories.findOneBySlug).mockResolvedValue(
      new Category({
        id: 'category',
        slug: 'tools',
        labelKo: '도구',
        labelEn: 'Tools',
      })
    );
    const resolver = createProductQueryResolver({ productRepository: repository, categoryRepository: categories });
    const first = await resolver.productsByCategory('tools', 'ko', 2);
    expect(first.edges.map(edge => edge.node.id)).toEqual(['p3', 'p2']);
    expect(first.totalCount).toBe(3);
    expect(first.pageInfo.hasNextPage).toBe(true);
    const second = await resolver.productsByCategory('tools', 'ko', 2, first.pageInfo.endCursor);
    expect(second.edges.map(edge => edge.node.id)).toEqual(['p1']);
    expect(second.pageInfo.hasNextPage).toBe(false);
  });

  it('fetches a bounded visual app page without fetching screenshot collections', async () => {
    const repository = createProductRepository({
      findVisualApps: vi.fn().mockResolvedValue({ products: [], total: 9000 }),
    });
    const resolver = createProductQueryResolver({ productRepository: repository });
    const result = await resolver.visualApps(24, undefined, 'App', 'app');
    expect(repository.findVisualApps).toHaveBeenCalledWith({
      limit: 25,
      afterId: undefined,
      query: 'App',
      productSlug: 'app',
    });
    expect(repository.findVisualAppCover).not.toHaveBeenCalled();
    expect(repository.countVisualAppScreenshots).not.toHaveBeenCalled();
    expect(result.totalCount).toBe(9000);
  });
  describe('features', () => {
    it('should return all features even when some translations fail', async () => {
      const features = [
        new DomainProductFeature({
          id: 'f1',
          name: 'Feature 1',
          summary: 'Summary 1',
          emoji: '🚀',
          productId: 'p1',
        }),
        new DomainProductFeature({
          id: 'f2',
          name: 'Feature 2',
          summary: 'Summary 2',
          emoji: '🔥',
          productId: 'p1',
        }),
        new DomainProductFeature({
          id: 'f3',
          name: 'Feature 3',
          summary: 'Summary 3',
          emoji: '💡',
          productId: 'p1',
        }),
      ];

      const mockGetProductFeatures = new GetProductFeatures(
        createProductFeatureRepository({
          findManyByProductId: vi.fn<ProductFeatureRepository['findManyByProductId']>().mockResolvedValue(features),
        })
      );

      const featureSourceValues: Record<string, string> = {
        'f1:name': 'Feature 1',
        'f1:summary': 'Summary 1',
        'f2:name': 'Feature 2',
        'f2:summary': 'Summary 2',
        'f3:name': 'Feature 3',
        'f3:summary': 'Summary 3',
      };

      let callCount = 0;
      const mockTranslationService = createTranslationService(
        createTranslationRepository({
          findOne: vi.fn<TranslationRepository['findOne']>().mockImplementation(params => {
            callCount++;
            if (callCount === 3) {
              return Promise.reject(new Error('Translation service unavailable'));
            }
            const sourceText = featureSourceValues[`${params.entityId}:${params.field}`];
            return Promise.resolve(
              createTranslationRow(`translated-${callCount}`, sourceText ? computeSourceHash(sourceText) : undefined)
            );
          }),
        })
      );
      vi.spyOn(mockTranslationService, 'getTranslation');

      const resolver = createProductQueryResolver({
        getProductFeaturesUseCase: mockGetProductFeatures,
        translationService: mockTranslationService,
      });

      const result = await resolver.features(createProductRoot('en'));

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('translated-1');
      expect(result[0].summary).toBe('translated-2');
      expect(result[1].name).toBe('Feature 2');
      expect(result[1].summary).toBe('translated-4');
      expect(result[2].name).toBe('translated-5');
      expect(result[2].summary).toBe('translated-6');
      expect(mockTranslationService.getTranslation).toHaveBeenCalledTimes(6);
    });

    it('should return other features when one feature processing fails entirely', async () => {
      const features = [
        new DomainProductFeature({
          id: 'f1',
          name: 'Feature 1',
          summary: 'Summary 1',
          emoji: '🚀',
          productId: 'p1',
        }),
        new DomainProductFeature({
          id: 'f2',
          name: 'Feature 2',
          summary: 'Summary 2',
          emoji: '🔥',
          productId: 'p1',
        }),
        new DomainProductFeature({
          id: 'f3',
          name: 'Feature 3',
          summary: 'Summary 3',
          emoji: '💡',
          productId: 'p1',
        }),
      ];

      const mockGetProductFeatures = new GetProductFeatures(
        createProductFeatureRepository({
          findManyByProductId: vi.fn<ProductFeatureRepository['findManyByProductId']>().mockResolvedValue(features),
        })
      );

      const featureSourceValues: Record<string, string> = {
        'f1:name': 'Feature 1',
        'f1:summary': 'Summary 1',
        'f2:name': 'Feature 2',
        'f2:summary': 'Summary 2',
        'f3:name': 'Feature 3',
        'f3:summary': 'Summary 3',
      };

      let callCount = 0;
      const mockTranslationService = createTranslationService(
        createTranslationRepository({
          findOne: vi.fn<TranslationRepository['findOne']>().mockImplementation(params => {
            callCount++;
            if (callCount === 3) {
              return Promise.reject(new Error('Network error'));
            }
            const sourceText = featureSourceValues[`${params.entityId}:${params.field}`];
            return Promise.resolve(
              createTranslationRow(`translated-${callCount}`, sourceText ? computeSourceHash(sourceText) : undefined)
            );
          }),
        })
      );
      vi.spyOn(mockTranslationService, 'getTranslation');

      const resolver = createProductQueryResolver({
        getProductFeaturesUseCase: mockGetProductFeatures,
        translationService: mockTranslationService,
      });

      const result = await resolver.features(createProductRoot('en'));

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('translated-1');
      expect(result[1].name).toBe('Feature 2');
      expect(result[2].name).toBe('translated-5');
    });
  });

  describe('alternatives', () => {
    it('should return alternatives even when some lookups fail', async () => {
      const mockGetAlternativeProducts = new GetAlternativeProducts(
        createAlternativeProductRepository({
          replaceByProductId: vi.fn<AlternativeProductRepository['replaceByProductId']>(),
          findManyByProductId: vi.fn<AlternativeProductRepository['findManyByProductId']>().mockResolvedValue([
            new AlternativeProduct({
              productId: 'p1',
              alternativeProductId: 'alt-1',
            }),
            new AlternativeProduct({
              productId: 'p1',
              alternativeProductId: 'alt-2',
            }),
            new AlternativeProduct({
              productId: 'p1',
              alternativeProductId: 'alt-3',
            }),
          ]),
        })
      );

      const publishedProductRepository = createProductRepository({
        findPublishedOneById: vi
          .fn<ProductRepository['findPublishedOneById']>()
          .mockResolvedValueOnce(
            new DomainProduct({
              id: 'alt-1',
              name: 'Product 1',
              slug: 'product-1',
              summary: 'Summary 1',
              logoUrl: 'https://example.com/logo1.png',
            })
          )
          .mockRejectedValueOnce(new Error('Database connection lost'))
          .mockResolvedValueOnce(
            new DomainProduct({
              id: 'alt-3',
              name: 'Product 3',
              slug: 'product-3',
              summary: 'Summary 3',
              logoUrl: 'https://example.com/logo3.png',
            })
          ),
      });
      const mockGetPublishedProduct = new GetPublishedProduct(publishedProductRepository);
      const mockTranslationService = createTranslationService();

      const resolver = createProductQueryResolver({
        getPublishedProductUseCase: mockGetPublishedProduct,
        getAlternativeProductsUseCase: mockGetAlternativeProducts,
        translationService: mockTranslationService,
      });

      const result = await resolver.alternatives(createProductRoot('en'));

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Product 1');
      expect(result[1].name).toBe('Product 3');
      expect(publishedProductRepository.findPublishedOneById).toHaveBeenCalledTimes(3);
    });
  });

  describe('selected field isolation', () => {
    it('does not eagerly load any related fields for 30 product nodes', async () => {
      const products = Array.from(
        { length: 30 },
        (_, index) =>
          new DomainProduct({
            id: `p${index}`,
            name: 'Product',
            slug: `product-${index}`,
            summary: '',
            logoUrl: '',
          })
      );
      const related = {
        getProductTagsUseCase: new GetProductTags(createProductTagRepository()),
        getVoteCountUseCase: new GetVoteCount(createVoteRepository()),
        getProductLinksUseCase: new GetProductLinks(createProductLinkRepository()),
        getProductScreenshotsUseCase: new GetProductScreenshots(createProductScreenshotRepository()),
        getProductFeaturesUseCase: new GetProductFeatures(createProductFeatureRepository()),
      };
      const spies = Object.values(related).map(useCase => vi.spyOn(useCase, 'execute'));
      const resolver = createProductQueryResolver({
        ...related,
        getRecentProductsUseCase: new GetRecentProducts(
          createProductRepository({
            findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue(products),
          })
        ),
      });
      expect(await resolver.recentProducts(30, 'ko')).toHaveLength(30);
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    });
    it('does not erase a healthy selected field when a peer product lookup fails', async () => {
      const tags = new GetProductTags(createProductTagRepository());
      const healthy = new ProductTag({ productId: 'healthy', tags: [new Tag({ id: 'tag', name: 'Healthy' })] });
      vi.spyOn(tags, 'execute').mockImplementation(async ({ productId }) => {
        if (productId === 'broken') throw new Error('one item failed');
        return healthy;
      });
      const resolver = createProductQueryResolver({ getProductTagsUseCase: tags });
      const result = await Promise.all([
        resolver.tags({ ...createProductRoot('ko'), id: 'broken' }),
        resolver.tags({ ...createProductRoot('ko'), id: 'healthy' }),
      ]);
      expect(result).toEqual([[], healthy.tags]);
    });
    it('일부 보조 배치가 실패해도 product node는 생존한다', async () => {
      const recentProductsUseCase = new GetRecentProducts(
        createProductRepository({
          findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([
            new DomainProduct({
              id: 'p1',
              name: 'Product 1',
              slug: 'product-1',
              summary: 'Summary 1',
              logoUrl: 'https://example.com/logo.png',
            }),
          ]),
        })
      );

      const rejectingTagsUseCase = new GetProductTags(createProductTagRepository());
      vi.spyOn(rejectingTagsUseCase, 'execute').mockRejectedValue(new Error('Tags batch failed'));

      const resolver = createProductQueryResolver({
        getRecentProductsUseCase: recentProductsUseCase,
        getProductTagsUseCase: rejectingTagsUseCase,
      });

      const result = await resolver.recentProducts(10, 'ko');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
      expect(rejectingTagsUseCase.execute).not.toHaveBeenCalled();

      const tags = await resolver.tags(result[0]);
      expect(tags).toEqual([]);
    });

    it('모든 보조 배치가 실패해도 product node는 생존한다', async () => {
      const recentProductsUseCase = new GetRecentProducts(
        createProductRepository({
          findTopNSortByPublishedAtDesc: vi.fn().mockResolvedValue([
            new DomainProduct({
              id: 'p1',
              name: 'Product 1',
              slug: 'product-1',
              summary: 'Summary 1',
              logoUrl: 'https://example.com/logo.png',
            }),
          ]),
        })
      );

      const rejectingTagsUseCase = new GetProductTags(createProductTagRepository());
      vi.spyOn(rejectingTagsUseCase, 'execute').mockRejectedValue(new Error('Tags batch failed'));

      const rejectingVoteCountUseCase = new GetVoteCount(createVoteRepository());
      vi.spyOn(rejectingVoteCountUseCase, 'execute').mockRejectedValue(new Error('Vote count batch failed'));

      const rejectingLinksUseCase = new GetProductLinks(createProductLinkRepository());
      vi.spyOn(rejectingLinksUseCase, 'execute').mockRejectedValue(new Error('Links batch failed'));

      const rejectingScreenshotsUseCase = new GetProductScreenshots(createProductScreenshotRepository());
      vi.spyOn(rejectingScreenshotsUseCase, 'execute').mockRejectedValue(new Error('Screenshots batch failed'));

      const rejectingFeaturesUseCase = new GetProductFeatures(createProductFeatureRepository());
      vi.spyOn(rejectingFeaturesUseCase, 'execute').mockRejectedValue(new Error('Features batch failed'));

      const resolver = createProductQueryResolver({
        getRecentProductsUseCase: recentProductsUseCase,
        getProductTagsUseCase: rejectingTagsUseCase,
        getVoteCountUseCase: rejectingVoteCountUseCase,
        getProductLinksUseCase: rejectingLinksUseCase,
        getProductScreenshotsUseCase: rejectingScreenshotsUseCase,
        getProductFeaturesUseCase: rejectingFeaturesUseCase,
      });

      const result = await resolver.recentProducts(10, 'ko');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');

      const tags = await resolver.tags(result[0]);
      expect(tags).toEqual([]);

      const voteCount = await resolver.voteCount(result[0]);
      expect(voteCount).toBe(0);

      const links = await resolver.links(result[0]);
      expect(links).toEqual([]);

      const screenshots = await resolver.screenshots(result[0]);
      expect(screenshots).toEqual([]);

      const features = await resolver.features(result[0]);
      expect(features).toEqual([]);
    });
  });

  describe('translateProducts with summary', () => {
    it('returns translated summary when en locale is requested and translation exists', async () => {
      const product = new DomainProduct({
        id: 'p1',
        name: '노션',
        slug: 'notion',
        summary: '올인원 생산성 도구',
        description: '한국어 설명',
        logoUrl: 'https://example.com/logo.png',
      });

      const publishedProductRepository = createProductRepository({
        findPublishedOneBySlug: vi.fn().mockResolvedValue(product),
      });
      const getPublishedProductUseCase = new GetPublishedProduct(publishedProductRepository);

      const translationRepository = createTranslationRepository({
        findMany: vi.fn().mockResolvedValue([
          {
            id: 't1',
            entityType: 'Product',
            entityId: 'p1',
            locale: 'en',
            field: 'name',
            value: 'Notion',
            sourceHash: computeSourceHash('노션'),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 't2',
            entityType: 'Product',
            entityId: 'p1',
            locale: 'en',
            field: 'summary',
            value: 'All-in-one productivity tool',
            sourceHash: computeSourceHash('올인원 생산성 도구'),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 't3',
            entityType: 'Product',
            entityId: 'p1',
            locale: 'en',
            field: 'description',
            value: 'English description',
            sourceHash: computeSourceHash('한국어 설명', 'description'),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      });

      const resolver = createProductQueryResolver({
        getPublishedProductUseCase,
        translationService: new TranslationService(translationRepository),
      });

      const result = await resolver.productBySlug('notion', 'en');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Notion');
      expect(result?.summary).toBe('All-in-one productivity tool');
      expect(result?.description).toBe('English description');
    });

    it('falls back to original Korean summary when translation is absent', async () => {
      const product = new DomainProduct({
        id: 'p1',
        name: '노션',
        slug: 'notion',
        summary: '올인원 생산성 도구',
        logoUrl: 'https://example.com/logo.png',
      });

      const publishedProductRepository = createProductRepository({
        findPublishedOneBySlug: vi.fn().mockResolvedValue(product),
      });
      const getPublishedProductUseCase = new GetPublishedProduct(publishedProductRepository);

      const translationRepository = createTranslationRepository({
        findMany: vi.fn().mockResolvedValue([]),
      });

      const resolver = createProductQueryResolver({
        getPublishedProductUseCase,
        translationService: new TranslationService(translationRepository),
      });

      const result = await resolver.productBySlug('notion', 'en');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('노션');
      expect(result?.summary).toBe('올인원 생산성 도구');
    });
  });

  describe('publishedProductsForSitemap', () => {
    it('returns published products for sitemap without requiring admin authorization', async () => {
      const mockProducts = [
        new DomainProduct({
          id: 'p1',
          name: 'Product 1',
          slug: 'product-1',
          summary: 'Summary 1',
          logoUrl: 'https://example.com/logo.png',
          publishedAt: new Date(),
        }),
      ];

      const publishedProductRepository = createProductRepository({
        findPublishedByAfterIdAndLimit: vi.fn().mockResolvedValue(mockProducts),
      });

      const resolver = createProductQueryResolver({
        getPublishedProductsForSitemapUseCase: new GetPublishedProductsForSitemap(publishedProductRepository),
      });

      const result = await resolver.publishedProductsForSitemap(100);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('product-1');
    });
  });
});
