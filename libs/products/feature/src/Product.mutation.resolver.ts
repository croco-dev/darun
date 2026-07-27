import { GetCompany } from '@darun/companies-domain';
import {
  AddProductLink,
  AddProductScreenshot,
  CreateProduct,
  DeleteProductScreenshot,
  EditProduct,
  GenerateProductDescription,
  GetProduct,
  GetProductTags,
  GetPublishedProduct,
  PublishProduct,
  RegisterProductCompany,
  UpdateProductLink,
  UpdateProductTag,
} from '@darun/products-domain';
import { productNotFound, productInvalidArgs } from '@darun/products-domain';
import { UpdateAlternativeProduct } from '@darun/recommendation-domain';
import { IndexProduct } from '@darun/search-domain';
import { TranslationJobService } from '@darun/translation-service';
import { AuthRole } from '@darun/utils-apollo-server';
import type { GraphQLContext } from '@darun/utils-apollo-server/src/libs/GraphQLContext';
import { UpvoteProduct } from '@darun/voting-domain';
import { Arg, Ctx, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { IndexProductInput } from './graphs/IndexProduct';
import { IndexProductPayload } from './graphs/IndexProduct';
import { Product } from './graphs/Product';
import { UpvoteProductPayload } from './graphs/UpvoteProduct';
import { ProductRecommendationMutationResolver } from './ProductRecommendationMutationResolver';

export * from './ProductCoreMutationResolver';
export * from './ProductMediaMutationResolver';
export * from './ProductPublishMutationResolver';
export * from './ProductRecommendationMutationResolver';

@Resolver(() => Product)
@Service()
export class ProductMutationResolver extends ProductRecommendationMutationResolver {
  constructor(
    getCompanyUseCase: GetCompany,
    createProductUseCase: CreateProduct,
    editProductUseCase: EditProduct,
    coreIndexProductUseCase: IndexProduct,
    updateProductTagUseCase: UpdateProductTag,
    getProductUseCase: GetProduct,
    getProductTagsUseCase: GetProductTags,
    addProductScreenshotUseCase: AddProductScreenshot,
    deleteProductScreenshotUseCase: DeleteProductScreenshot,
    addProductLinkUseCase: AddProductLink,
    updateProductLinkUseCase: UpdateProductLink,
    registerProductCompanyUseCase: RegisterProductCompany,
    generateProductDescriptionUseCase: GenerateProductDescription,
    publishProductUseCase: PublishProduct,
    publishIndexProductUseCase: IndexProduct,
    translationJobService: TranslationJobService,
    updateAlternativeProductUseCase: UpdateAlternativeProduct,
    private readonly standaloneIndexProductUseCase: IndexProduct,
    private readonly getPublishedProductUseCase: GetPublishedProduct,
    private readonly upvoteProductUseCase: UpvoteProduct
  ) {
    super(
      getCompanyUseCase,
      createProductUseCase,
      editProductUseCase,
      coreIndexProductUseCase,
      updateProductTagUseCase,
      getProductUseCase,
      getProductTagsUseCase,
      addProductScreenshotUseCase,
      deleteProductScreenshotUseCase,
      addProductLinkUseCase,
      updateProductLinkUseCase,
      registerProductCompanyUseCase,
      generateProductDescriptionUseCase,
      publishProductUseCase,
      publishIndexProductUseCase,
      translationJobService,
      updateAlternativeProductUseCase
    );
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => IndexProductPayload)
  async indexProduct(@Arg('input') input: IndexProductInput): Promise<IndexProductPayload> {
    const product = await this.getPublishedProductUseCase.execute({
      slug: input.slug,
    });

    if (!product) {
      throw productNotFound();
    }

    const indexed = await this.standaloneIndexProductUseCase.execute({
      id: product.id,
      name: product.name,
      slug: product.slug,
      summary: product.summary,
      description: product.description,
      publishedAt: product.publishedAt,
    });

    return {
      indexed,
    };
  }

  @Mutation(() => UpvoteProductPayload)
  async upvoteProduct(@Arg('slug') slug: string, @Ctx() ctx: GraphQLContext): Promise<UpvoteProductPayload> {
    const product = await this.getPublishedProductUseCase.execute({ slug });

    if (!product) {
      throw productNotFound();
    }

    if (!ctx.clientIp) {
      throw productInvalidArgs('Client IP is required for upvoting');
    }

    await this.upvoteProductUseCase.execute({
      productId: product.id,
      voterIp: ctx.clientIp,
    });

    return {
      product: await this.getPublishedProductUseCase.execute({ slug }),
    };
  }
}
