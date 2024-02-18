import { GetProduct, GetProductLinks, GetProductsCount, GetRecentProducts } from '@darun/backend';
import { Arg, FieldResolver, ID, Int, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { Link } from './types/Link';
import { Product } from './types/Product';

@Resolver(() => Product)
@Service()
export class ProductResolver {
  constructor(
    private readonly getRecentProducts: GetRecentProducts,
    private readonly getProduct: GetProduct,
    private readonly getProductLinks: GetProductLinks,
    private readonly getProductsCount: GetProductsCount
  ) {}

  @Query(() => [Product])
  public recentProducts() {
    return this.getRecentProducts.execute();
  }

  @Query(() => Product, { nullable: true })
  public product(@Arg('id', () => ID) id: string) {
    return this.getProduct.execute({ id });
  }

  @Query(() => Product, { nullable: true })
  public productBySlug(@Arg('slug', () => String) slug: string) {
    return this.getProduct.execute({ slug });
  }

  @Query(() => Int)
  public productsCount() {
    return this.getProductsCount.execute();
  }

  @FieldResolver(() => [Link])
  public links(@Root() product: Product) {
    return this.getProductLinks.execute({ productId: product.id });
  }
}
