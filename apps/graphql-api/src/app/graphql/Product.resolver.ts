import { GetProduct, GetRecentProducts } from '@darun/backend';
import { Arg, ID, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Product } from './Product.type';

@Resolver(() => Product)
@Service()
export class ProductResolver {
  constructor(
    private readonly getRecentProducts: GetRecentProducts,
    private readonly getProduct: GetProduct
  ) {}

  @Query(() => [Product])
  public recentProducts() {
    return this.getRecentProducts.execute();
  }

  @Query(() => Product)
  public product(@Arg('id', () => ID) id: string) {
    return this.getProduct.execute({ id });
  }
}
