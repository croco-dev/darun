import type { SignImageUpload } from '@darun/images-domain';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import type { SignImageUploadInput } from './graphs/SignImageUpload';
import { SignImageUploadPayload } from './graphs/SignImageUpload';

@Resolver()
@Service()
export class ImageMutationResolver {
  constructor(private readonly signImageUploadUseCase: SignImageUpload) {}

  @Mutation(() => SignImageUploadPayload)
  async signImageUpload(@Arg('input') input: SignImageUploadInput): Promise<SignImageUploadPayload> {
    return this.signImageUploadUseCase.execute(input);
  }
}
