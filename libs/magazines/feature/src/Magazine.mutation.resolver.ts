import { CreateMagazine, EditMagazine, GetMagazine, PublishMagazine } from '@darun/magazines-domain';
import { magazineNotFound } from '@darun/magazines-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { GraphQLContext } from '@darun/utils-apollo-server/src/libs/GraphQLContext';
import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { CreateMagazineInput } from './graphs/CreateMagazine';
import { CreateMagazinePayload } from './graphs/CreateMagazine';
import { EditMagazineInput } from './graphs/EditMagazine';
import { EditMagazinePayload } from './graphs/EditMagazine';
import { Magazine } from './graphs/Magazine';
import { PublishMagazineInput } from './graphs/PublishMagazine';
import { PublishMagazinePayload } from './graphs/PublishMagazine';

@Resolver(() => Magazine)
@Service()
export class MagazineMutationResolver {
  constructor(
    private readonly createMagazineUseCase: CreateMagazine,
    private readonly getMagazineUseCase: GetMagazine,
    private readonly publishMagazineUseCase: PublishMagazine,
    private readonly editMagazineUseCase: EditMagazine
  ) {}

  @Authorized([AuthRole.Admin])
  @Mutation(() => CreateMagazinePayload)
  async createMagazine(
    @Arg('input') input: CreateMagazineInput,
    @Ctx() context: GraphQLContext
  ): Promise<CreateMagazinePayload> {
    const userId = await context.getUserIdOrThrow();
    const magazine = await this.createMagazineUseCase.execute({
      ...input,
      authorId: userId,
    });

    return {
      magazine,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => PublishMagazinePayload)
  async publishMagazine(@Arg('input') input: PublishMagazineInput): Promise<PublishMagazinePayload> {
    const magazine = await this.getMagazineUseCase.execute({
      slug: input.slug,
    });

    if (!magazine) {
      throw magazineNotFound();
    }

    const updated = await this.publishMagazineUseCase.execute({
      id: magazine.id,
    });

    return {
      magazine: updated,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => EditMagazinePayload)
  async editMagazine(@Arg('slug') slug: string, @Arg('input') input: EditMagazineInput): Promise<EditMagazinePayload> {
    const magazine = await this.getMagazineUseCase.execute({ slug });

    if (!magazine) {
      throw magazineNotFound();
    }

    const updated = await this.editMagazineUseCase.execute({
      id: magazine.id,
      ...input,
    });

    return {
      magazine: updated,
    };
  }
}
