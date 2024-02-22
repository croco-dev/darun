import { CreateProduct } from '@darun/backend';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { CreateProductInput, CreateProductPayload } from './graphs/CreateProduct';
import { Product } from './graphs/Product';

@Resolver(() => Product)
@Service()
export class ProductMutationResolver {
  constructor(private readonly createProductUseCase: CreateProduct) {}

  @Mutation(() => CreateProductPayload)
  async createProduct(@Arg('input') input: CreateProductInput): Promise<CreateProductPayload> {
    const product = await this.createProductUseCase.execute(input);

    return {
      product,
    };
  }
}
