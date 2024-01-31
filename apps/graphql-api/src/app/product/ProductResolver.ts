import { GetRecentProducts } from '@darun/products-domain';
import { Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Product } from './Product.type';

@Resolver()
@Service()
export class ProductResolver {
  constructor(private readonly getRecentProducts: GetRecentProducts) {}

  @Query(() => [Product])
  recentProducts() {
    return this.getRecentProducts.execute();
  }
}
