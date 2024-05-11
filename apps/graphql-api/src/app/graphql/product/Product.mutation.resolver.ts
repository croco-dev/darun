import { AddProductTag, CreateProduct, GetPublishedProduct, IndexProduct } from '@darun/backend';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { AddProductTagsInput, AddProductTagsPayload } from './graphs/AddProductTags';
import { CreateProductInput, CreateProductPayload } from './graphs/CreateProduct';
import { IndexProductInput, IndexProductPayload } from './graphs/IndexProduct';
import { Product } from './graphs/Product';

@Resolver(() => Product)
@Service()
export class ProductMutationResolver {
  constructor(
    private readonly createProductUseCase: CreateProduct,
    private readonly indexProductUseCase: IndexProduct,
    private readonly addProductTagUseCase: AddProductTag,
    private readonly getPublishedProductUseCase: GetPublishedProduct
  ) {}

  @Authorized([AuthRole.Admin])
  @Mutation(() => CreateProductPayload)
  async createProduct(@Arg('input') input: CreateProductInput): Promise<CreateProductPayload> {
    const product = await this.createProductUseCase.execute(input);

    return {
      product,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => IndexProductPayload)
  async indexProduct(@Arg('input') input: IndexProductInput): Promise<IndexProductPayload> {
    const product = await this.getPublishedProductUseCase.execute({ slug: input.slug });

    if (!product) {
      throw new Error('Product not found');
    }

    const indexed = await this.indexProductUseCase.execute({
      id: product.id,
      name: product.name,
      slug: product.slug,
      summary: product.summary,
      description: product.description,
    });

    return {
      indexed,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => AddProductTagsPayload)
  async addProductTags(
    @Arg('slug') slug: string,
    @Arg('input') input: AddProductTagsInput
  ): Promise<AddProductTagsPayload> {
    const product = await this.getPublishedProductUseCase.execute({ slug });

    if (!product) {
      throw new Error('Product not found');
    }

    await this.addProductTagUseCase.execute({
      productId: product.id,
      tagNames: input.tagNames,
    });

    return {
      product: await this.getPublishedProductUseCase.execute({ slug }),
    };
  }
}
