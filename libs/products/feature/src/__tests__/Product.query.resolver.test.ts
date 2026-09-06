import 'reflect-metadata';

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
  Connection: class Connection {},
  ConnectionArgs: class ConnectionArgs {},
  Cursor: class Cursor {},
  PageInfo: class PageInfo {},
}));

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
  GetRankedProducts,
  GetRecentProducts,
  Product as DomainProduct,
  ProductFeature as DomainProductFeature,
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
import { TranslationService, type TranslationRepository } from '@darun/translation-domain';
import { GetVoteCount, type VoteRepository } from '@darun/voting-domain';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '../graphs/Product';
import { ProductQueryResolver } from '../Product.query.resolver';

type ResolverOverrides = Partial<{
  getProductFeaturesUseCase: GetProductFeatures;
  getPublishedProductUseCase: GetPublishedProduct;
  getAlternativeProductsUseCase: GetAlternativeProducts;
  translationService: TranslationService;
  getRecentProductsUseCase: GetRecentProducts;
  getProductTagsUseCase: GetProductTags;
  getVoteCountUseCase: GetVoteCount;
  getProductLinksUseCase: GetProductLinks;
  getProductScreenshotsUseCase: GetProductScreenshots;
}>;

const createProductRepository = (overrides: Partial<ProductRepository> = {}): ProductRepository => ({
  updateById: vi.fn<ProductRepository['updateById']>(),
  findAllByBeforeIdAndLimit: vi.fn<ProductRepository['findAllByBeforeIdAndLimit']>().mockResolvedValue([]),
  findAllByAfterIdAndLimit: vi.fn<ProductRepository['findAllByAfterIdAndLimit']>().mockResolvedValue([]),
  findTopNSortByPublishedAtDesc: vi.fn<ProductRepository['findTopNSortByPublishedAtDesc']>().mockResolvedValue([]),
  findPublishedByIds: vi.fn<ProductRepository['findPublishedByIds']>().mockResolvedValue([]),
  findPublishedOneById: vi.fn<ProductRepository['findPublishedOneById']>().mockResolvedValue(null),
  findOneBySlug: vi.fn<ProductRepository['findOneBySlug']>().mockResolvedValue(null),
  findOneById: vi.fn<ProductRepository['findOneById']>().mockResolvedValue(null),
  findPublishedOneBySlug: vi.fn<ProductRepository['findPublishedOneBySlug']>().mockResolvedValue(null),
  findPublishedByCategoryId: vi.fn<ProductRepository['findPublishedByCategoryId']>().mockResolvedValue([]),
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
  findByEntity: vi.fn<TranslationRepository['findByEntity']>().mockResolvedValue([]),
  ...overrides,
});

const createTranslationService = (repository = createTranslationRepository()) => new TranslationService(repository);

const createTranslationRow = (value: string) => ({
  id: value,
  entityType: 'ProductFeature',
  entityId: value,
  locale: 'en',
  field: 'name',
  value,
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
  const productRepository = createProductRepository();
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
    new GetProductsByCategory(productRepository, createCategoryRepository()),
    overrides.translationService ?? createTranslationService()
  );
};

describe('ProductQueryResolver', () => {
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

      let callCount = 0;
      const mockTranslationService = createTranslationService(
        createTranslationRepository({
          findOne: vi.fn<TranslationRepository['findOne']>().mockImplementation(() => {
            callCount++;
            if (callCount === 3) {
              return Promise.reject(new Error('Translation service unavailable'));
            }
            return Promise.resolve(createTranslationRow(`translated-${callCount}`));
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

      let callCount = 0;
      const mockTranslationService = createTranslationService(
        createTranslationRepository({
          findOne: vi.fn<TranslationRepository['findOne']>().mockImplementation(() => {
            callCount++;
            if (callCount === 3) {
              return Promise.reject(new Error('Network error'));
            }
            return Promise.resolve(createTranslationRow(`translated-${callCount}`));
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

  describe('preloadFields', () => {
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
});
