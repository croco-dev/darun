import { CreateMagazine } from '@darun/backend';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { CreateMagazineInput, CreateMagazinePayload } from './graphs/CreateMagazine';
import { Magazine } from './graphs/Magazine';

@Resolver(() => Magazine)
@Service()
export class MagazineMutationResolver {
  constructor(private readonly createMagazineUseCase: CreateMagazine) {}

  @Authorized([AuthRole.Admin])
  @Mutation(() => CreateMagazinePayload)
  async createMagazine(@Arg('input') input: CreateMagazineInput): Promise<CreateMagazinePayload> {
    const magazine = await this.createMagazineUseCase.execute(input);

    return {
      magazine,
    };
  }
}
