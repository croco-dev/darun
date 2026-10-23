import { GetCompany } from '@darun/companies-domain';
import {
  AddProductLink,
  AddProductScreenshot,
  ApplyProductDescriptionCandidate,
  CreateProduct,
  DeleteProductScreenshot,
  EditProduct,
  GenerateProductDescriptionCandidate,
  GetProduct,
  GetProductTags,
  GetPublishedProduct,
  PublishProduct,
  RegisterProductCompany,
  UpdateProductLink,
  UpdateProductScreenshot,
  UpdateProductTag,
} from '@darun/products-domain';
import { ProductContentSyncToken, type ProductContentSync } from '@darun/products-domain';
import { productNotFound, productInvalidArgs } from '@darun/products-domain';
import { ProductDescriptionJobService } from '@darun/products-service';
import { UpdateAlternativeProduct } from '@darun/recommendation-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import type { GraphQLContext } from '@darun/utils-apollo-server/src/libs/GraphQLContext';
import { UpvoteProduct } from '@darun/voting-domain';
import { Arg, Ctx, Authorized, Mutation, Resolver } from 'type-graphql';
import { Inject, Service } from 'typedi';
import { IndexProductInput, IndexProductPayload, ProductContentSyncOverview } from './graphs/IndexProduct';
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
    updateProductTagUseCase: UpdateProductTag,
    getProductUseCase: GetProduct,
    getProductTagsUseCase: GetProductTags,
    addProductScreenshotUseCase: AddProductScreenshot,
    deleteProductScreenshotUseCase: DeleteProductScreenshot,
    addProductLinkUseCase: AddProductLink,
    updateProductLinkUseCase: UpdateProductLink,
    updateProductScreenshotUseCase: UpdateProductScreenshot,
    registerProductCompanyUseCase: RegisterProductCompany,
    generateProductDescriptionUseCase: GenerateProductDescriptionCandidate,
    publishProductUseCase: PublishProduct,
    updateAlternativeProductUseCase: UpdateAlternativeProduct,
    private readonly getPublishedProductUseCase: GetPublishedProduct,
    private readonly upvoteProductUseCase: UpvoteProduct,
    @Inject(ProductContentSyncToken) private readonly contentSync: ProductContentSync,
    applyProductDescriptionCandidateUseCase?: ApplyProductDescriptionCandidate,
    productDescriptionJobService?: ProductDescriptionJobService
  ) {
    super(
      getCompanyUseCase,
      createProductUseCase,
      editProductUseCase,
      updateProductTagUseCase,
      getProductUseCase,
      getProductTagsUseCase,
      addProductScreenshotUseCase,
      deleteProductScreenshotUseCase,
      addProductLinkUseCase,
      updateProductLinkUseCase,
      updateProductScreenshotUseCase,
      registerProductCompanyUseCase,
      generateProductDescriptionUseCase,
      publishProductUseCase,
      updateAlternativeProductUseCase,
      applyProductDescriptionCandidateUseCase,
      productDescriptionJobService
    );
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => IndexProductPayload)
  async indexProduct(@Arg('input') input: IndexProductInput): Promise<IndexProductPayload> {
    return this.contentSync.requestSearch(input.slug);
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => ProductContentSyncOverview, {
    description:
      '관리자만 호출할 수 있다. 각 kind 최신 failed intent만 재예약하며 실패 번역은 새 logical job으로 연결한다. canonical 원문과 과거 job 이력은 유지하고 완료되지 않은 예약을 성공으로 표시하지 않는다. 실패한 최신 intent가 없으면 CONTENT_SYNC_NOT_RETRYABLE.',
  })
  retryProductContentSync(@Arg('slug') slug: string): Promise<ProductContentSyncOverview> {
    return this.contentSync.retry(slug);
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
      // Re-read by id, not slug: the slug could have changed between the two
      // reads (TOCTOU), returning a different product or a miss.
      product: await this.getPublishedProductUseCase.execute({ id: product.id }),
    };
  }
}
