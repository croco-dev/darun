import { GetCategories, GetProduct, UpdateProductCategories } from '@darun/products-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Field, ID, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Category } from './graphs/Category';

@ObjectType('AdminProductCategorySelection')
class AdminProductCategorySelection {
  @Field(() => ID)
  productId: string;

  @Field(() => [ID])
  categoryIds: string[];

  @Field(() => [Category])
  categories: Category[];
}

@Resolver()
@Service()
export class AdminProductCategoriesResolver {
  constructor(
    private readonly getProduct: GetProduct,
    private readonly getCategories: GetCategories,
    private readonly updateCategories: UpdateProductCategories
  ) {}

  @Authorized([AuthRole.Admin])
  @Query(() => AdminProductCategorySelection, { nullable: true })
  async adminProductCategorySelection(
    @Arg('slug', () => String) slug: string
  ): Promise<AdminProductCategorySelection | null> {
    const product = await this.getProduct.execute({ slug });
    if (!product) return null;

    return {
      productId: product.id,
      categoryIds: product.categoryIds,
      categories: await this.getCategories.execute(),
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => [ID])
  updateProductCategories(
    @Arg('productId', () => ID) productId: string,
    @Arg('categoryIds', () => [ID]) categoryIds: string[]
  ): Promise<string[]> {
    return this.updateCategories.execute(productId, categoryIds);
  }
}
