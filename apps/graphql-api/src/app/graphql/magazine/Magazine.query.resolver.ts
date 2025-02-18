import { GetMagazine, GetPublishedMagazine } from '@darun/backend';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, ID, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Magazine } from './graphs/Magazine';

@Resolver(() => Magazine)
@Service()
export class MagazineQueryResolver {
  constructor(
    private readonly getPublishedMagazineUseCase: GetPublishedMagazine,
    private readonly getMagazineUseCase: GetMagazine
  ) {}

  @Query(() => Magazine, { nullable: true })
  public magazine(@Arg('id', () => ID) id: string) {
    return this.getPublishedMagazineUseCase.execute({ id });
  }

  @Query(() => Magazine, { nullable: true })
  public magazineBySlug(@Arg('slug', () => String) slug: string) {
    return this.getPublishedMagazineUseCase.execute({ slug });
  }

  @Authorized([AuthRole.Admin])
  @Query(() => Magazine, { nullable: true })
  public tempMagazineBySlug(@Arg('slug', () => String) slug: string) {
    return this.getMagazineUseCase.execute({ slug });
  }
}
