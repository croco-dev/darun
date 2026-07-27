import { SignImageUpload } from '@darun/images-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { SignImageUploadInput } from './graphs/SignImageUpload';
import { SignImageUploadPayload } from './graphs/SignImageUpload';

@Resolver()
@Service()
export class ImageMutationResolver {
  constructor(private readonly signImageUploadUseCase: SignImageUpload) {}

  @Authorized([AuthRole.Admin])
  @Mutation(() => SignImageUploadPayload)
  async signImageUpload(
    @Arg('input', () => SignImageUploadInput) input: SignImageUploadInput
  ): Promise<SignImageUploadPayload> {
    return this.signImageUploadUseCase.execute(input);
  }
}
