import {
  GetCompany,
  GetProduct,
  GetProductFeatures,
  GetProductLinks,
  GetProductsCount,
  GetProductScreenshots,
  GetProductTags,
  GetRecentProducts,
  SearchProduct,
} from '@darun/backend';
import { Arg, FieldResolver, ID, Int, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { Company } from '../company/graphs/Company';
import { Feature } from '../feature/graphs/Feature';
import { Link } from './graphs/Link';
import { Product } from './graphs/Product';
import { Screenshot } from './graphs/Screenshot';
import { Tag } from './graphs/Tag';

@Resolver(() => Product)
@Service()
export class ProductQueryResolver {
  constructor(
    private readonly getRecentProductsUseCase: GetRecentProducts,
    private readonly getProductUseCase: GetProduct,
    private readonly getProductLinksUseCase: GetProductLinks,
    private readonly getProductTagsUseCase: GetProductTags,
    private readonly getProductScreenshotsUseCase: GetProductScreenshots,
    private readonly getProductsCountUseCase: GetProductsCount,
    private readonly getProductFeaturesUseCase: GetProductFeatures,
    private readonly getCompanyUseCase: GetCompany,
    private readonly searchProductUseCase: SearchProduct
  ) {}

  @Query(() => [Product])
  public recentProducts(@Arg('first', () => Int) first: number) {
    return this.getRecentProductsUseCase.execute({ limit: first });
  }

  @Query(() => Product, { nullable: true })
  public product(@Arg('id', () => ID) id: string) {
    return this.getProductUseCase.execute({ id });
  }

  @Query(() => Product, { nullable: true })
  public productBySlug(@Arg('slug', () => String) slug: string) {
    return this.getProductUseCase.execute({ slug });
  }

  @Query(() => Int)
  public productsCount() {
    return this.getProductsCountUseCase.execute();
  }

  @Query(() => [Product])
  public async searchProducts(@Arg('query', () => String) query: string) {
    const searchableProducts = await this.searchProductUseCase.execute({ query });
    return searchableProducts.map(searchableProduct => this.getProductUseCase.execute({ id: searchableProduct.id }));
  }

  @FieldResolver(() => [Link])
  public links(@Root() product: Product) {
    return this.getProductLinksUseCase.execute({ productId: product.id });
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
}
