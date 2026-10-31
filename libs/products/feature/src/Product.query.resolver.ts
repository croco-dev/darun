import { GetCompany } from '@darun/companies-domain';
import { Company } from '@darun/companies-feature/server';
import type { ProductRepository } from '@darun/products-domain';
import {
  GetAllProducts,
  GetProduct,
  GetProductFeatures,
  GetProductLinks,
  GetProductScreenshots,
  GetProductsCount,
  GetProductTags,
  GetPublishedProduct,
  GetPublishedProductsForSitemap,
  GetRankedProducts,
  GetRecentProducts,
  GetProductsByCategory,
  Product as DomainProduct,
} from '@darun/products-domain';
import { ProductRepositoryToken } from '@darun/products-domain';
import { GetAlternativeProducts } from '@darun/recommendation-domain';
import { SearchProduct } from '@darun/search-domain';
import { TranslationService } from '@darun/translation-domain';
import { ConnectionArgs } from '@darun/utils-apollo-server';
import { AuthRole, Connection, Cursor } from '@darun/utils-apollo-server';
import { GetVoteCount } from '@darun/voting-domain';
import { getDirectiveValues, GraphQLIncludeDirective, GraphQLSkipDirective, Kind } from 'graphql';
import type { GraphQLResolveInfo, SelectionSetNode } from 'graphql';
import { Arg, Args, Authorized, FieldResolver, ID, Info, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject, Service } from 'typedi';
import { Feature } from './graphs/Feature';
import { Link } from './graphs/Link';
import { Product } from './graphs/Product';
import { ProductConnection } from './graphs/ProductPagination';
import { Screenshot } from './graphs/Screenshot';
import { Tag } from './graphs/Tag';

type ProductWithLocale = Product & {
  locale?: string;
};

type PublishedProduct = DomainProduct;

const MAX_LIST_LIMIT = 100;
const MAX_SITEMAP_LIMIT = 200;
const MAX_SEARCH_RESULTS = 100;

function validateListLimit(first: number, max: number): number {
  const limit = first;
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new Error('pagination/invalid-connection-args');
  }
  return limit;
}

function selectsProductDescription(info: GraphQLResolveInfo): boolean {
  const visitedFragments = new Set<string>();
  const selectsDescription = (selectionSet?: SelectionSetNode): boolean =>
    selectionSet?.selections.some(selection => {
      if (
        getDirectiveValues(GraphQLSkipDirective, selection, info.variableValues)?.if === true ||
        getDirectiveValues(GraphQLIncludeDirective, selection, info.variableValues)?.if === false
      ) {
        return false;
      }
      if (selection.kind === Kind.FIELD) {
        return selection.name.value === 'description';
      }
      if (selection.kind === Kind.INLINE_FRAGMENT) {
        return selectsDescription(selection.selectionSet);
      }
      const name = selection.name.value;
      if (visitedFragments.has(name)) {
        return false;
      }
      visitedFragments.add(name);
      return selectsDescription(info.fragments[name]?.selectionSet);
    }) ?? false;

  return info.fieldNodes.some(node => selectsDescription(node.selectionSet));
}

@Resolver(() => Product)
@Service()
export class ProductQueryResolver {
  constructor(
    private readonly getRecentProductsUseCase: GetRecentProducts,
    private readonly getRankedProductsUseCase: GetRankedProducts,
    private readonly getAllProductsUseCase: GetAllProducts,
    private readonly getProductUseCase: GetProduct,
    private readonly getPublishedProductUseCase: GetPublishedProduct,
    private readonly getProductLinksUseCase: GetProductLinks,
    private readonly getProductTagsUseCase: GetProductTags,
    private readonly getProductScreenshotsUseCase: GetProductScreenshots,
    private readonly getProductsCountUseCase: GetProductsCount,
    private readonly getProductFeaturesUseCase: GetProductFeatures,
    private readonly getCompanyUseCase: GetCompany,
    private readonly searchProductUseCase: SearchProduct,
    private readonly getAlternativeProductsUseCase: GetAlternativeProducts,
    private readonly getVoteCountUseCase: GetVoteCount,
    private readonly getProductsByCategoryUseCase: GetProductsByCategory,
    private readonly translationService: TranslationService,
    private readonly getPublishedProductsForSitemapUseCase: GetPublishedProductsForSitemap,
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

  private normalizeLocale(locale: string): 'ko' | 'en' {
    return locale === 'en' ? 'en' : 'ko';
  }

  private async translateProduct(product: PublishedProduct, locale: string): Promise<ProductWithLocale> {
    const [translatedProduct] = await this.translateProducts([product], locale);

    return translatedProduct;
  }

  private async translateProducts(
    products: PublishedProduct[],
    locale: string,
    includeDescription = true
  ): Promise<ProductWithLocale[]> {
    const normalizedLocale = this.normalizeLocale(locale);

    if (products.length === 0) {
      return [];
    }

    const localizedProducts = products.map(product => ({
      ...product,
      locale: normalizedLocale,
    }));

    if (normalizedLocale === 'ko') {
      return localizedProducts;
    }

    try {
      const translatedFields = await this.translationService.getTranslations({
        entityType: 'Product',
        locale: normalizedLocale,
        entries: localizedProducts.flatMap(product => {
          const entries = [
            {
              entityId: product.id,
              field: 'name',
              koreanValue: product.name,
            },
          ];

          if (typeof product.summary === 'string') {
            entries.push({
              entityId: product.id,
              field: 'summary',
              koreanValue: product.summary,
            });
          }

          if (includeDescription && typeof product.description === 'string') {
            entries.push({
              entityId: product.id,
              field: 'description',
              koreanValue: product.description,
            });
          }

          return entries;
        }),
      });

      return localizedProducts.map(product => ({
        ...product,
        name: translatedFields.get(`${product.id}:name`) ?? product.name,
        summary:
          typeof product.summary === 'string'
            ? (translatedFields.get(`${product.id}:summary`) ?? product.summary)
            : product.summary,
        description:
          typeof product.description === 'string'
            ? (translatedFields.get(`${product.id}:description`) ?? product.description)
            : undefined,
      }));
    } catch (error) {
      console.error('Failed to translate products, returning default products:', error);
      return localizedProducts;
    }
  }

  @Query(() => [Product])
  public async recentProducts(
    @Arg('first', () => Int) first: number,
    @Arg('locale', () => String, { defaultValue: 'ko' }) locale: string,
    @Info() info?: GraphQLResolveInfo
  ) {
    const products = await this.getRecentProductsUseCase.execute({
      limit: validateListLimit(first, MAX_LIST_LIMIT),
    });
    const translated = await this.translateProducts(products, locale, info ? selectsProductDescription(info) : true);
    return translated;
  }

  @Query(() => [Product])
  public async rankedProducts(
    @Arg('first', () => Int) first: number,
    @Arg('locale', () => String, { defaultValue: 'ko' }) locale: string,
    @Info() info?: GraphQLResolveInfo
  ) {
    const products = await this.getRankedProductsUseCase.execute({
      limit: validateListLimit(first, MAX_LIST_LIMIT),
    });
    const translated = await this.translateProducts(products, locale, info ? selectsProductDescription(info) : true);
    return translated;
  }

  @Query(() => Product, { nullable: true })
  public async product(
    @Arg('id', () => ID) id: string,
    @Arg('locale', () => String, { defaultValue: 'ko' }) locale: string
  ) {
    const product = await this.getPublishedProductUseCase.execute({ id });

    if (!product) {
      return product;
    }

    return this.translateProduct(product, locale);
  }

  @Query(() => Product, { nullable: true })
  public async productBySlug(
    @Arg('slug', () => String) slug: string,
    @Arg('locale', () => String, { defaultValue: 'ko' }) locale: string
  ) {
    const product = await this.getPublishedProductUseCase.execute({ slug });

    if (!product) {
      return product;
    }

    return this.translateProduct(product, locale);
  }

  @Query(() => Int)
  public productsCount() {
    return this.getProductsCountUseCase.execute();
  }

  @Query(() => [Product])
  public async searchProducts(
    @Arg('query', () => String) query: string,
    @Arg('locale', () => String, { defaultValue: 'ko' }) locale: string
  ) {
    const searchableProducts = await this.searchProductUseCase.execute({
      query,
    });
    const searchableProductIds = searchableProducts.map(searchableProduct => searchableProduct.id);

    const products = (await this.getPublishedProductUseCase.execute({
      ids: searchableProductIds,
    })) as (PublishedProduct | null)[];

    const translated = await this.translateProducts(
      products.filter((product): product is PublishedProduct => Boolean(product)).slice(0, MAX_SEARCH_RESULTS),
      locale
    );
    return translated;
  }

  @Authorized([AuthRole.Admin])
  @Query(() => ProductConnection)
  public async allProducts(@Args(() => ConnectionArgs) connectionArgs: ConnectionArgs): Promise<ProductConnection> {
    const { cursor, limit, type } = Connection.verifyArgs(connectionArgs);
    const decoded = cursor ? Cursor.decode(cursor, ['id'] as const) : undefined;

    const { products, total } = await this.getAllProductsUseCase.execute({
      cursor: decoded,
      limit,
      type: type as 'after' | 'before',
    });

    return Connection.create({
      totalCount: total,
      nodes: products,
      cursorKeys: ['id'],
      previous: {
        cursor,
        limit,
      },
    });
  }

  @Query(() => [Product])
  public async publishedProductsForSitemap(
    @Arg('first', () => Int, { defaultValue: 100 }) first: number,
    @Arg('after', () => String, { nullable: true }) after?: string
  ) {
    const { products } = await this.getPublishedProductsForSitemapUseCase.execute({
      limit: validateListLimit(first, MAX_SITEMAP_LIMIT),
      cursor: after,
    });
    return products;
  }

  @FieldResolver(() => [Link])
  public async links(@Root() product: ProductWithLocale) {
    const links = await this.getProductLinksUseCase
      .execute({
        productId: product.id,
      })
      .catch(error => {
        console.error('Product links lookup failed', product.id, error);
        return [];
      });

    return links.map((link, index) => ({ ...link, isPrimary: index === 0 }));
  }

  @FieldResolver(() => [Tag])
  public async tags(@Root() product: ProductWithLocale): Promise<Tag[]> {
    const productTag = await this.getProductTagsUseCase.execute({
      productId: product.id,
    });

    return productTag?.tags ?? [];
  }

  @FieldResolver(() => [Screenshot])
  public async screenshots(@Root() product: ProductWithLocale) {
    return this.getProductScreenshotsUseCase.execute({ productId: product.id }).catch(error => {
      console.error('Product screenshots lookup failed', product.id, error);
      return [];
    });
  }

  @FieldResolver(() => [Feature])
  public async features(@Root() product: ProductWithLocale) {
    const features = await this.getProductFeaturesUseCase.execute({ productId: product.id }).catch(error => {
      console.error('Product features lookup failed', product.id, error);
      return [];
    });

    const locale = this.normalizeLocale(product.locale ?? 'ko');

    if (locale === 'ko') {
      return features;
    }

    try {
      const translatedFields = await this.translationService.getTranslations({
        entityType: 'ProductFeature',
        locale,
        entries: features.flatMap(feature => [
          { entityId: feature.id, field: 'name', koreanValue: feature.name },
          ...(typeof feature.summary === 'string'
            ? [{ entityId: feature.id, field: 'summary', koreanValue: feature.summary }]
            : []),
        ]),
      });

      return features.map(feature => ({
        ...feature,
        name: translatedFields.get(`${feature.id}:name`) ?? feature.name,
        summary:
          typeof feature.summary === 'string'
            ? (translatedFields.get(`${feature.id}:summary`) ?? feature.summary)
            : feature.summary,
      }));
    } catch (error) {
      console.error('Product feature translations lookup failed', product.id, error);
      return features;
    }
  }

  @FieldResolver(() => Company, { nullable: true })
  public ownedCompany(@Root() product: Product) {
    if (!product.ownedCompanyId) {
      return null;
    }

    return this.getCompanyUseCase.execute({ id: product.ownedCompanyId });
  }

  @FieldResolver(() => [Product])
  public async alternatives(@Root() product: ProductWithLocale) {
    const alternativeProducts = await this.getAlternativeProductsUseCase.execute({
      productId: product.id,
    });
    const results = await this.getPublishedProductUseCase.execute({
      ids: alternativeProducts.map(alternative => alternative.alternativeProductId),
    });
    const products = results.filter((product): product is PublishedProduct => product !== null);

    return this.translateProducts(products, product.locale ?? 'ko');
  }

  @FieldResolver(() => Int)
  public async voteCount(@Root() product: ProductWithLocale) {
    return this.getVoteCountUseCase.execute({ productId: product.id }).catch(error => {
      console.error('Product vote count lookup failed', product.id, error);
      return 0;
    });
  }

  @Query(() => ProductConnection)
  public async productsByCategory(
    @Arg('slug', () => String) slug: string,
    @Arg('locale', () => String, { defaultValue: 'ko' }) locale: string,
    @Arg('first', () => Int, { defaultValue: 24 }) first: number,
    @Arg('after', () => String, { nullable: true }) after?: string
  ) {
    const limit = validateListLimit(first, MAX_LIST_LIMIT);
    const afterId = after ? Cursor.decode(after, ['id'] as const).id : undefined;
    const { products, getTotalCount } = await this.getProductsByCategoryUseCase.execute({
      slug,
      limit: limit + 1,
      afterId,
    });
    return this.productConnection(await this.translateProducts(products, locale), getTotalCount, limit, after);
  }

  @Query(() => ProductConnection)
  public async visualApps(
    @Arg('first', () => Int, { defaultValue: 24 }) first: number,
    @Arg('after', () => String, { nullable: true }) after?: string,
    @Arg('query', () => String, { nullable: true }) query?: string,
    @Arg('productSlug', () => String, { nullable: true }) productSlug?: string
  ) {
    const limit = validateListLimit(first, MAX_LIST_LIMIT);
    const afterId = after ? Cursor.decode(after, ['id'] as const).id : undefined;
    const { products, total } = await this.productRepository.findVisualApps({
      limit: limit + 1,
      afterId,
      query,
      productSlug,
    });
    return this.productConnection(products, total, limit, after);
  }

  private productConnection(
    products: Product[],
    totalCount: number | (() => Promise<number>),
    limit: number,
    after?: string
  ) {
    const edges = products.slice(0, limit).map(node => ({ node, cursor: Cursor.encode(node, ['id'] as const) }));
    return {
      // GraphQL reads this property only when the field survives selection and directives.
      get totalCount() {
        return typeof totalCount === 'function' ? totalCount() : totalCount;
      },
      edges,
      pageInfo: {
        hasNextPage: products.length > limit,
        hasPreviousPage: Boolean(after),
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    };
  }

  @FieldResolver(() => Screenshot, { nullable: true })
  public coverScreenshot(@Root() product: Product) {
    return this.productRepository.findVisualAppCover(product.id);
  }

  @FieldResolver(() => [Screenshot])
  public previewScreenshots(@Root() product: Product) {
    return this.productRepository.findVisualAppPreviews(product.id);
  }

  @FieldResolver(() => Int)
  public screenshotCount(@Root() product: Product) {
    return this.productRepository.countVisualAppScreenshots(product.id);
  }

  @FieldResolver(() => Boolean)
  public hasAlternatives(@Root() product: Product) {
    return this.productRepository.hasPublishedAlternatives(product.id);
  }

  @Authorized([AuthRole.Admin])
  @Query(() => Product, { nullable: true })
  public async tempProductBySlug(
    @Arg('slug', () => String) slug: string,
    @Arg('locale', () => String, { defaultValue: 'ko' }) locale: string
  ) {
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      return product;
    }

    return this.translateProduct(product as PublishedProduct, locale);
  }
}
