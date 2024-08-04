import {
  GetAlternativeProducts,
  GetCompany,
  GetPublishedProduct,
  GetProductFeatures,
  GetProductLinks,
  GetProductsCount,
  GetProductScreenshots,
  GetProductTags,
  GetRecentProducts,
  SearchProduct,
  GetAllProducts,
  GetProduct,
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

@Resolver(() => Product)
@Service()
export class ProductQueryResolver {
  constructor(
    private readonly getRecentProductsUseCase: GetRecentProducts,
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
    private readonly getAlternativeProductsUseCase: GetAlternativeProducts
  ) {}

  @Query(() => [Product])
  public recentProducts(@Arg('first', () => Int) first: number) {
    return this.getRecentProductsUseCase.execute({ limit: first });
  }

  @Query(() => Product, { nullable: true })
  public product(@Arg('id', () => ID) id: string) {
    return this.getPublishedProductUseCase.execute({ id });
  }

  @Query(() => Product, { nullable: true })
  public productBySlug(@Arg('slug', () => String) slug: string) {
    return this.getPublishedProductUseCase.execute({ slug });
  }

  @Query(() => Int)
  public productsCount() {
    return this.getProductsCountUseCase.execute();
  }

  @Query(() => [Product])
  public async searchProducts(@Arg('query', () => String) query: string) {
    const searchableProducts = await this.searchProductUseCase.execute({ query });

    return Promise.all(
      searchableProducts.map(searchableProduct => this.getPublishedProductUseCase.execute({ id: searchableProduct.id }))
    ).then(products => products.filter(product => Boolean(product)));
  }

  @Authorized([AuthRole.Admin])
  @Query(() => ProductConnection)
  public async allProducts(@Args() connectionArgs: ConnectionArgs): Promise<ProductConnection> {
    const { cursor, limit } = Connection.verifyArgs(connectionArgs);
    const decoded = cursor ? Cursor.decode(cursor, ['id'] as const) : undefined;

    const { products, total } = await this.getAllProductsUseCase.execute({
      cursor: decoded,
      limit,
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
  public tags(@Root() product: Product) {
    return this.getProductTagsUseCase.execute({ productId: product.id });
  }

  @FieldResolver(() => [Screenshot])
  public screenshots(@Root() product: Product) {
    return this.getProductScreenshotsUseCase.execute({ productId: product.id });
  }

  @FieldResolver(() => [Feature])
  public features(@Root() product: Product) {
    return this.getProductFeaturesUseCase.execute({ productId: product.id });
  }

  @FieldResolver(() => Company, { nullable: true })
  public ownedCompany(@Root() product: Product) {
    if (!product.ownedCompanyId) {
      return null;
    }
    return this.getCompanyUseCase.execute({ id: product.ownedCompanyId });
  }

  @FieldResolver(() => [Product])
  public async alternatives(@Root() product: Product) {
    const alternativeProducts = await this.getAlternativeProductsUseCase.execute({ productId: product.id });
    const products = await Promise.all(
      alternativeProducts.map(alternativeProduct =>
        this.getPublishedProductUseCase.execute({ id: alternativeProduct.alternativeProductId })
      )
    );

    return products.filter(product => Boolean(product));
  }

  @Authorized([AuthRole.Admin])
  @Query(() => Product, { nullable: true })
  public tempProductBySlug(@Arg('slug', () => String) slug: string) {
    return this.getProductUseCase.execute({ slug });
  }
}
