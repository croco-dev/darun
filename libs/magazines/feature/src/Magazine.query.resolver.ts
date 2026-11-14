import { GetProfile, type Profile } from '@darun/accounts-domain';
import {
  GetMagazine,
  GetMagazineList,
  GetPublishedMagazine,
  GetPublishedMagazineList,
  magazineInvalidArgs,
  type PublishedMagazineCursor,
} from '@darun/magazines-domain';
import { AuthRole, Cursor, type GraphQLContext } from '@darun/utils-apollo-server';
import DataLoader from 'dataloader';
import { Arg, Authorized, Ctx, FieldResolver, ID, Int, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { Author } from './graphs/Author';
import { Magazine } from './graphs/Magazine';
import { MagazinePagination } from './graphs/MagazinePagination';
import { PublishedMagazineConnection } from './graphs/PublishedMagazineConnection';

@Resolver(() => Magazine)
@Service()
export class MagazineQueryResolver {
  constructor(
    private readonly getPublishedMagazineUseCase: GetPublishedMagazine,
    private readonly getMagazineUseCase: GetMagazine,
    private readonly getProfileUseCase: GetProfile,
    private readonly getMagazineListUseCase: GetMagazineList,
    private readonly getPublishedMagazineListUseCase: GetPublishedMagazineList
  ) {}

  private readonly requestLoaders = new WeakMap<
    GraphQLContext,
    {
      content: DataLoader<string, string | null>;
      author: DataLoader<string, Profile | null>;
    }
  >();

  private loaders(context: GraphQLContext) {
    let loaders = this.requestLoaders.get(context);
    if (!loaders) {
      loaders = {
        content: new DataLoader(ids => this.getPublishedMagazineUseCase.contents(ids), { maxBatchSize: 100 }),
        author: new DataLoader(ids => this.getProfileUseCase.executeMany(ids), { maxBatchSize: 100 }),
      };
      this.requestLoaders.set(context, loaders);
    }
    return loaders;
  }

  @Query(() => PublishedMagazineConnection)
  public async publishedMagazines(
    @Arg('first', () => Int, { nullable: true }) first?: number,
    @Arg('after', () => String, { nullable: true }) after?: string
  ): Promise<PublishedMagazineConnection> {
    let position: PublishedMagazineCursor | undefined;
    if (after != null) {
      try {
        const decoded = Cursor.decode(after, ['kind', 'publishedAt', 'id'] as const);
        if (decoded.kind !== 'published-magazines') throw magazineInvalidArgs();
        position = { publishedAt: decoded.publishedAt, id: decoded.id };
      } catch {
        throw magazineInvalidArgs('Invalid magazine cursor');
      }
    }
    const page = await this.getPublishedMagazineListUseCase.execute({
      first: first ?? 24,
      after: position,
    });
    const edges = page.items.map(({ magazine, position }) => ({
      node: magazine,
      cursor: Cursor.encode({ kind: 'published-magazines', ...position }, ['kind', 'publishedAt', 'id']),
    }));
    return {
      edges,
      pageInfo: {
        hasNextPage: page.hasNextPage,
        hasPreviousPage: after != null,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    };
  }

  @FieldResolver(() => String, { nullable: true })
  public content(@Root() magazine: Magazine, @Ctx() context: GraphQLContext): Promise<string | null> | string | null {
    if (Object.prototype.hasOwnProperty.call(magazine, 'content')) return magazine.content ?? null;
    return this.loaders(context).content.load(magazine.id);
  }

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
  public async author(@Root() magazine: Magazine, @Ctx() context: GraphQLContext): Promise<Author | null> {
    const profile = await this.loaders(context).author.load(magazine.authorId);

    return profile
      ? {
          id: profile.id,
          name: profile.displayName,
        }
      : null;
  }
}
