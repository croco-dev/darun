import { CreateProductFeature, GetProduct } from '@darun/backend';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { CreateProductFeatureInput, CreateProductFeaturePayload } from './graphs/CreateProductFeature';
import { Feature } from './graphs/Feature';

@Resolver(() => Feature)
@Service()
export class FeatureMutationResolver {
  constructor(
    private readonly createProductFeatureUseCase: CreateProductFeature,
    private readonly getProductUseCase: GetProduct
  ) {}

  @Mutation(() => CreateProductFeaturePayload)
  async createProductFeature(@Arg('input') input: CreateProductFeatureInput): Promise<CreateProductFeaturePayload> {
    const product = await this.getProductUseCase.execute({ slug: input.productSlug });
    if (!product) {
      throw new Error('Product not found');
    }

    const productFeature = await this.createProductFeatureUseCase.execute({
      name: input.name,
      emoji: input.emoji,
      summary: input.summary,

      productId: product.id,
    });

    return {
      feature: productFeature,
    };
  }
}
