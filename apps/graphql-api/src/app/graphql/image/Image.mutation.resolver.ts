import { SignImageUpload } from '@darun/backend';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { SignImageUploadInput, SignImageUploadPayload } from './graphs/SignImageUpload';

@Resolver()
@Service()
export class ImageMutationResolver {
  constructor(private readonly signImageUploadUseCase: SignImageUpload) {}

  @Mutation(() => SignImageUploadPayload)
  async signImageUpload(@Arg('input') input: SignImageUploadInput): Promise<SignImageUploadPayload> {
    return this.signImageUploadUseCase.execute(input);
  }
}
