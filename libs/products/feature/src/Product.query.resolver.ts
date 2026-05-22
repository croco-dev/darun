import { GetCompany } from '@darun/companies-domain';
import { Company } from '@darun/companies-feature/server';
import {
  GetAllProducts,
  GetProduct,
  GetProductFeatures,
  GetProductLinks,
  GetProductScreenshots,
  GetProductsCount,
  GetProductTags,
  GetPublishedProduct,
  GetRankedProducts,
  GetRecentProducts,
  GetProductsByCategory,
  Product as DomainProduct,
} from '@darun/products-domain';
import { GetAlternativeProducts } from '@darun/recommendation-domain';
import { SearchProduct } from '@darun/search-domain';
import { TranslationService } from '@darun/translation-domain';
import { ConnectionArgs } from '@darun/utils-apollo-server';
import { AuthRole, Connection, Cursor } from '@darun/utils-apollo-server';
import { GetVoteCount } from '@darun/voting-domain';
import { Arg, Args, Authorized, FieldResolver, ID, Int, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
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
    private readonly translationService: TranslationService
  ) {}

  private normalizeLocale(locale: string): 'ko' | 'en' {
    return locale === 'en' ? 'en' : 'ko';
  }

  private async translateProduct(product: PublishedProduct, locale: string): Promise<ProductWithLocale> {
    const [translatedProduct] = await this.translateProducts([product], locale);

    return translatedProduct;
  }

  private async translateProducts(products: PublishedProduct[], locale: string): Promise<ProductWithLocale[]> {
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

        if (typeof product.description === 'string') {
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
      description:
        typeof product.description === 'string'
          ? translatedFields.get(`${product.id}:description`) ?? product.description
          : undefined,
    }));
  }

  @Query(() => [Product])
  public async recentProducts(
    @Arg('first', () => Int) first: number,
    @Arg('locale', () => String, { defaultValue: 'ko' }) locale: string
  ) {
    const products = await this.getRecentProductsUseCase.execute({
      limit: first,
    });
    return this.translateProducts(products, locale);
  }

  @Query(() => [Product])
  public async rankedProducts(
    @Arg('first', () => Int) first: number,
    @Arg('locale', () => String, { defaultValue: 'ko' }) locale: string
  ) {
    const products = await this.getRankedProductsUseCase.execute({
      limit: first,
    });
    return this.translateProducts(products, locale);
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

    return this.translateProducts(
      products.filter((product): product is PublishedProduct => Boolean(product)),
      locale
    );
  }

  @Authorized([AuthRole.Admin])
  @Query(() => ProductConnection)
  public async allProducts(@Args() connectionArgs: ConnectionArgs): Promise<ProductConnection> {
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

  @FieldResolver(() => [Link])
  public async links(@Root() product: Product) {
    const links = await this.getProductLinksUseCase.execute({
      productId: product.id,
    });

    return links.map((link, index) => ({ ...link, isPrimary: index === 0 }));
  }

  @FieldResolver(() => [Tag])
  public async tags(@Root() product: Product): Promise<Tag[]> {
    const productTag = await this.getProductTagsUseCase.execute({
      productId: product.id,
    });

    return productTag?.tags ?? [];
  }

  @FieldResolver(() => [Screenshot])
  public screenshots(@Root() product: Product) {
    return this.getProductScreenshotsUseCase.execute({ productId: product.id });
  }

  @FieldResolver(() => [Feature])
  public async features(@Root() product: ProductWithLocale) {
    const features = await this.getProductFeaturesUseCase.execute({
      productId: product.id,
    });
    const locale = this.normalizeLocale(product.locale ?? 'ko');

    if (locale === 'ko') {
      return features;
    }

    const settledFeaturesResults = await Promise.allSettled(
      features.map(async feature => {
        const [nameResult, summaryResult] = await Promise.allSettled([
          this.translationService.getTranslation({
            entityType: 'ProductFeature',
            entityId: feature.id,
            locale,
            field: 'name',
            koreanValue: feature.name,
          }),
          typeof feature.summary === 'string'
            ? this.translationService.getTranslation({
                entityType: 'ProductFeature',
                entityId: feature.id,
                locale,
                field: 'summary',
                koreanValue: feature.summary,
              })
            : Promise.resolve(undefined),
        ]);

        const translatedFeature = {
          ...feature,
          name: nameResult.status === 'fulfilled' ? nameResult.value : feature.name,
          summary: summaryResult.status === 'fulfilled' ? summaryResult.value : feature.summary,
        } as (typeof features)[number];

        return translatedFeature;
      })
    );

    return settledFeaturesResults
      .filter((r): r is PromiseFulfilledResult<(typeof features)[number]> => r.status === 'fulfilled')
      .map(r => r.value);
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
    const results = await Promise.allSettled(
      alternativeProducts.map(alternativeProduct =>
        this.getPublishedProductUseCase.execute({
          id: alternativeProduct.alternativeProductId,
        })
      )
    );

    const products = results
      .filter((r): r is PromiseFulfilledResult<PublishedProduct | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((p): p is PublishedProduct => Boolean(p));

    return this.translateProducts(products, product.locale ?? 'ko');
  }

  @FieldResolver(() => Int)
  public async voteCount(@Root() product: Product) {
    return this.getVoteCountUseCase.execute({ productId: product.id });
  }

  @Query(() => [Product])
  public async productsByCategory(
    @Arg('slug', () => String) slug: string,
    @Arg('locale', () => String, { defaultValue: 'ko' }) locale: string
  ) {
    const { products } = await this.getProductsByCategoryUseCase.execute({
      slug,
    });

    return this.translateProducts(products, locale);
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
