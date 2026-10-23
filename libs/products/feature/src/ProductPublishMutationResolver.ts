import { ApplyProductDescriptionCandidate, GetProduct, PublishProduct } from '@darun/products-domain';
import { productNotFound } from '@darun/products-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { GraphQLError } from 'graphql';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { ApplyProductDescriptionCandidatePayload } from './graphs/ApplyProductDescriptionCandidate';
import { Product } from './graphs/Product';
import { PublishProductInput } from './graphs/PublishProduct';
import { PublishProductPayload } from './graphs/PublishProduct';
import { ProductMediaMutationResolver } from './ProductMediaMutationResolver';

@Resolver(() => Product)
export class ProductPublishMutationResolver extends ProductMediaMutationResolver {
  constructor(
    getCompanyUseCase: ProductMediaMutationResolver['getCompanyUseCase'],
    createProductUseCase: ProductMediaMutationResolver['createProductUseCase'],
    editProductUseCase: ProductMediaMutationResolver['editProductUseCase'],
    updateProductTagUseCase: ProductMediaMutationResolver['updateProductTagUseCase'],
    getProductUseCase: GetProduct,
    getProductTagsUseCase: ProductMediaMutationResolver['getProductTagsUseCase'],
    addProductScreenshotUseCase: ProductMediaMutationResolver['addProductScreenshotUseCase'],
    deleteProductScreenshotUseCase: ProductMediaMutationResolver['deleteProductScreenshotUseCase'],
    addProductLinkUseCase: ProductMediaMutationResolver['addProductLinkUseCase'],
    updateProductLinkUseCase: ProductMediaMutationResolver['updateProductLinkUseCase'],
    updateProductScreenshotUseCase: ProductMediaMutationResolver['updateProductScreenshotUseCase'],
    registerProductCompanyUseCase: ProductMediaMutationResolver['registerProductCompanyUseCase'],
    generateProductDescriptionUseCase: ProductMediaMutationResolver['generateProductDescriptionUseCase'],
    protected readonly publishProductUseCase: PublishProduct,
    protected readonly applyProductDescriptionCandidateUseCase?: ApplyProductDescriptionCandidate,
    productDescriptionJobService?: ProductMediaMutationResolver['productDescriptionJobService']
  ) {
    super(
      createProductUseCase,
      editProductUseCase,
      updateProductTagUseCase,
      getProductUseCase,
      getProductTagsUseCase,
      getCompanyUseCase,
      addProductScreenshotUseCase,
      deleteProductScreenshotUseCase,
      addProductLinkUseCase,
      updateProductLinkUseCase,
      updateProductScreenshotUseCase,
      registerProductCompanyUseCase,
      generateProductDescriptionUseCase,
      productDescriptionJobService
    );
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => ApplyProductDescriptionCandidatePayload)
  async applyProductDescriptionCandidate(
    @Arg('jobId') jobId: string
  ): Promise<ApplyProductDescriptionCandidatePayload> {
    if (!this.applyProductDescriptionCandidateUseCase) {
      throw new Error('ApplyProductDescriptionCandidate usecase가 주입되지 않았습니다.');
    }

    const result = await this.applyProductDescriptionCandidateUseCase.execute({ jobId }).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'STALE_CANDIDATE') {
        throw new GraphQLError(error.message, { extensions: { code: 'STALE_CANDIDATE' } });
      }
      throw error;
    });
    const { product: updatedProduct, job, alreadyApplied } = result;

    return {
      product: updatedProduct,
      alreadyApplied,
      job: {
        id: job.id,
        productId: job.productId,
        status: job.status,
        dispatchStatus: job.dispatchStatus,
        runNotBefore: job.runNotBefore,
        nextDispatchAt: job.nextDispatchAt,
        retryOfJobId: job.retryOfJobId ?? undefined,
        message: job.message ?? undefined,
        error: job.error ?? undefined,
        evidenceHash: job.evidenceHash ?? undefined,
        baseDescriptionHash: job.baseDescriptionHash ?? undefined,
        candidateHtml: job.candidateHtml ?? undefined,
        appliedAt: job.appliedAt ?? undefined,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => PublishProductPayload)
  async publishProduct(@Arg('input') input: PublishProductInput): Promise<PublishProductPayload> {
    const product = await this.getProductUseCase.execute({ slug: input.slug });

    if (!product) {
      throw productNotFound();
    }

    const updatedProduct = await this.publishProductUseCase.execute({
      id: product.id,
    });

    return {
      product: updatedProduct,
    };
  }
}
