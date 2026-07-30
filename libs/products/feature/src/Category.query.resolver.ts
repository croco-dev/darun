import { GetCategories } from '@darun/products-domain';
import { Arg, Int, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Category } from './graphs/Category';

@Resolver(() => Category)
@Service()
export class CategoryQueryResolver {
  constructor(private readonly getCategoriesUseCase: GetCategories) {}

  @Query(() => [Category])
  public categories(
    @Arg('first', () => Int) first: number,
    @Arg('locale', () => String, { defaultValue: 'ko' }) _locale: string
  ) {
    return this.getCategoriesUseCase.execute({ first });
  }
}
