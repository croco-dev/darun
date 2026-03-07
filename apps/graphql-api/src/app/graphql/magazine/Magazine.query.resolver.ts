import { GetProfile } from '@darun/accounts-domain';
import { GetMagazine, GetPublishedMagazine, GetMagazineList } from '@darun/magazines-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, FieldResolver, ID, Int, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { Author } from '../author/graphs/Author';
import { Magazine } from './graphs/Magazine';
import { MagazinePagination } from './graphs/MagazinePagination';

@Resolver(() => Magazine)
@Service()
export class MagazineQueryResolver {
  constructor(
    private readonly getPublishedMagazineUseCase: GetPublishedMagazine,
    private readonly getMagazineUseCase: GetMagazine,
    private readonly getProfileUseCase: GetProfile,
    private readonly getMagazineListUseCase: GetMagazineList
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

  @Authorized([AuthRole.Admin])
  @Query(() => MagazinePagination)
  public async tempAllMagazines(@Arg('page', () => Int) page: number): Promise<MagazinePagination> {
    const limit = 50;
    const { data, total } = await this.getMagazineListUseCase.execute({
      page,
      limit,
    });

    return {
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      magazines: data,
    };
  }

  @FieldResolver(() => Author, { nullable: true })
  public async author(@Root() magazine: Magazine): Promise<Author | null> {
    const profile = await this.getProfileUseCase.execute({
      userId: magazine.authorId,
    });

    return profile
      ? {
          id: profile.id,
          name: profile.displayName,
        }
      : null;
  }
}
