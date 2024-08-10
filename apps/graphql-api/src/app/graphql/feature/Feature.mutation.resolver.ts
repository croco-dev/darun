import { CreateProductFeature, GetProduct, GetProductFeature, UpdateProductFeature } from '@darun/backend';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { CreateProductFeatureInput, CreateProductFeaturePayload } from './graphs/CreateProductFeature';
import { Feature } from './graphs/Feature';
import { UpdateProductFeatureInput, UpdateProductFeaturePayload } from './graphs/UpdateProductFeature';

@Resolver(() => Feature)
@Service()
export class FeatureMutationResolver {
  constructor(
    private readonly createProductFeatureUseCase: CreateProductFeature,
    private readonly getProductUseCase: GetProduct,
    private readonly getProductFeatureUseCase: GetProductFeature,
    private readonly updateProductFeatureUseCase: UpdateProductFeature
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

  @Authorized([AuthRole.Admin])
  @Mutation(() => UpdateProductFeaturePayload)
  async updateProductFeature(
    @Arg('id') id: string,
    @Arg('input') input: UpdateProductFeatureInput
  ): Promise<UpdateProductFeaturePayload> {
    const product = await this.getProductFeatureUseCase.execute({ id });

    if (!product) {
      throw new Error('Product가 존재하지 않습니다.');
    }

    return {
      feature: await this.updateProductFeatureUseCase.execute({ ...input, featureId: id }),
    };
  }
}
