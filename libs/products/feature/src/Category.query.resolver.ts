import { GetCategories, GetCategoryBySlug } from '@darun/products-domain';
import { Arg, Int, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Category } from './graphs/Category';

@Resolver(() => Category)
@Service()
export class CategoryQueryResolver {
  constructor(
    private readonly getCategoriesUseCase: GetCategories,
    private readonly getCategoryBySlugUseCase: GetCategoryBySlug
  ) {}

  @Query(() => Category, { nullable: true })
  public categoryBySlug(@Arg('slug', () => String) slug: string) {
    return this.getCategoryBySlugUseCase.execute(slug);
  }

  @Query(() => [Category])
  public categories(
    @Arg('first', () => Int) first: number,
    @Arg('locale', () => String, { defaultValue: 'ko' }) _locale: string
  ) {
    return this.getCategoriesUseCase.execute({ first });
  }
}
