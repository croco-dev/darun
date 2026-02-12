import {
  GetAlternativeProducts,
  GetAllProducts,
  GetCompany,
  GetProduct,
  GetProductFeatures,
  GetProductLinks,
  GetProductsCount,
  GetProductScreenshots,
  GetProductTags,
  GetPublishedProduct,
  GetRankedProducts,
  GetRecentProducts,
  GetVoteCount,
  SearchProduct,
  TranslationService,
} from '@darun/backend';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Args, Authorized, FieldResolver, ID, Int, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { Connection } from '../common/Connection';
import { ConnectionArgs } from '../common/ConnectionArgs';
import { Cursor } from '../common/Cursor';
import { Company } from '../company/graphs/Company';
import { Feature } from '../feature/graphs/Feature';
import { Link } from './graphs/Link';
import { Product } from './graphs/Product';
import { ProductConnection } from './graphs/ProductPagination';
import { Screenshot } from './graphs/Screenshot';
import { Tag } from './graphs/Tag';

type ProductWithLocale = Product & {
  locale?: string;
};

type PublishedProduct = NonNullable<Awaited<ReturnType<GetPublishedProduct['execute']>>>;

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
    private readonly translationService: TranslationService
  ) {}

  private normalizeLocale(locale: string): 'ko' | 'en' {
    return locale === 'en' ? 'en' : 'ko';
  }

  private async translateProduct(product: PublishedProduct, locale: string): Promise<ProductWithLocale> {
    const normalizedLocale = this.normalizeLocale(locale);
    const localizedProduct: ProductWithLocale = {
      ...product,
      locale: normalizedLocale,
    };

    if (normalizedLocale === 'ko') {
      return localizedProduct;
    }

    const [name, description] = await Promise.all([
      this.translationService.getTranslation({
        entityType: 'Product',
        entityId: product.id,
        locale: normalizedLocale,
        field: 'name',
        koreanValue: product.name,
      }),
      typeof product.description === 'string'
        ? this.translationService.getTranslation({
            entityType: 'Product',
            entityId: product.id,
            locale: normalizedLocale,
            field: 'description',
            koreanValue: product.description,
          })
        : Promise.resolve(undefined),
    ]);

    return {
      ...localizedProduct,
      name,
      description,
    };
  }

  private async translateProducts(products: PublishedProduct[], locale: string): Promise<ProductWithLocale[]> {
    return Promise.all(products.map(product => this.translateProduct(product, locale)));
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

    const products = (await Promise.all(
      searchableProducts.map(searchableProduct => this.getPublishedProductUseCase.execute({ id: searchableProduct.id }))
    ).then(products => products.filter(product => Boolean(product)))) as PublishedProduct[];

    return this.translateProducts(products, locale);
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
  public links(@Root() product: Product) {
    return this.getProductLinksUseCase
      .execute({ productId: product.id })
      .then(links => links.map((link, index) => ({ ...link, isPrimary: index === 0 })));
  }

  @FieldResolver(() => [Tag])
  public tags(@Root() product: Product): Promise<Tag[]> {
    return this.getProductTagsUseCase.execute({ productId: product.id }).then(productTag => productTag?.tags ?? []);
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

    return Promise.all(
      features.map(async feature => {
        const [name, summary] = await Promise.all([
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

        return {
          ...feature,
          name,
          summary,
        };
      })
    );
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
    const products = (await Promise.all(
      alternativeProducts.map(alternativeProduct =>
        this.getPublishedProductUseCase.execute({
          id: alternativeProduct.alternativeProductId,
        })
      )
    ).then(products => products.filter(alternativeProduct => Boolean(alternativeProduct)))) as PublishedProduct[];

    return this.translateProducts(products, product.locale ?? 'ko');
  }

  @FieldResolver(() => Int)
  public async voteCount(@Root() product: Product) {
    return this.getVoteCountUseCase.execute({ productId: product.id });
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
