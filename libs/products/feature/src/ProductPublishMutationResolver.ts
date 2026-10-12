import { ApplyProductDescriptionCandidate, GetProduct, PublishProduct } from '@darun/products-domain';
import { productNotFound } from '@darun/products-domain';
import { IndexProduct } from '@darun/search-domain';
import { TranslationJobService } from '@darun/translation-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { ApplyProductDescriptionCandidatePayload } from './graphs/ApplyProductDescriptionCandidate';
import { EditProductInput } from './graphs/EditProduct';
import { EditProductPayload } from './graphs/EditProduct';
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
    coreIndexProductUseCase: ProductMediaMutationResolver['indexProductUseCase'],
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
    protected readonly publishIndexProductUseCase: IndexProduct,
    protected readonly translationJobService: TranslationJobService,
    protected readonly applyProductDescriptionCandidateUseCase?: ApplyProductDescriptionCandidate,
    productDescriptionJobService?: ProductMediaMutationResolver['productDescriptionJobService']
  ) {
    super(
      createProductUseCase,
      editProductUseCase,
      coreIndexProductUseCase,
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

  /**
   * 발행된 콘텐츠 동기화: 하나의 논리적 색인 업데이트와 하나의 번역 intent 기록.
   * 재실행은 같은 입력에 대해 같은 결과를 내고, 더 새 리비전을 되돌리지 않는다.
   */
  protected async syncPublishedContent(
    product: Product,
    options?: { expectedUpdatedAt?: Date }
  ): Promise<void> {
    if (product.publishedAt === undefined) {
      return;
    }

    // 하나의 논리적 색인 업데이트: 커밋된 현재 상태를 다시 읽어 색인한다.
    // 실패한 색인은 같은 revision으로 재실행해도 같은 결과를 낸다.
    await this.runDegradedSideEffect('syncPublishedContent', 'search-index-sync', async () => {
      const [productTag, domainProduct] = await Promise.all([
        this.getProductTagsUseCase.execute({ productId: product.id }),
        this.getProductUseCase.execute({ slug: product.slug }),
      ]);
      if (options?.expectedUpdatedAt && domainProduct?.updatedAt) {
        if (domainProduct.updatedAt.getTime() > options.expectedUpdatedAt.getTime()) {
          // 더 새 리비전이 이미 커밋됐다: 오래된 스냅샷으로 색인을 되돌리지 않는다.
          return;
        }
      }

      await this.publishIndexProductUseCase.execute({
        id: product.id,
        name: domainProduct?.name ?? product.name,
        slug: domainProduct?.slug ?? product.slug,
        summary: domainProduct?.summary ?? product.summary,
        description: domainProduct?.description ?? product.description,
        tags: productTag ? productTag.tags.map(tag => tag.name) : [],
        category: domainProduct?.categoryIds[0] ?? '',
        publishedAt: domainProduct?.publishedAt ?? product.publishedAt,
      });
    });

    // 번역 intent는 정식 커밋 경로에서 한 번만 기록한다. 같은 revision의
    // 재실행은 중복 job을 만들지 않고 기존 intent를 재사용한다.
    await this.runDegradedSideEffect('syncPublishedContent', 'translation-job-trigger', async () => {
      await this.translationJobService.requestProductTranslationJob(product.id);
    });
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => EditProductPayload)
  async editProduct(@Arg('slug') slug: string, @Arg('input') input: EditProductInput): Promise<EditProductPayload> {
    const result = await super.editProduct(slug, input);
    const updatedProduct = result.product;

    if (updatedProduct.publishedAt !== undefined) {
      const hasContentChange =
        input.name !== undefined || input.summary !== undefined || input.description !== undefined;

      if (hasContentChange) {
        // super.editProduct가 이미 하나의 색인 업데이트를 수행했다.
        // 여기서는 번역 intent만 정식 커밋 경로에서 한 번 기록한다.
        await this.runDegradedSideEffect('editProduct', 'translation-job-trigger', async () => {
          await this.translationJobService.requestProductTranslationJob(updatedProduct.id);
        });
      }
    }

    return result;
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => ApplyProductDescriptionCandidatePayload)
  async applyProductDescriptionCandidate(
    @Arg('jobId') jobId: string
  ): Promise<ApplyProductDescriptionCandidatePayload> {
    if (!this.applyProductDescriptionCandidateUseCase) {
      throw new Error('ApplyProductDescriptionCandidate usecase가 주입되지 않았습니다.');
    }

    const { product: updatedProduct, job } = await this.applyProductDescriptionCandidateUseCase.execute({
      jobId,
    });

    if (updatedProduct.publishedAt !== undefined) {
      await this.syncPublishedContent(updatedProduct);
    }

    return {
      product: updatedProduct,
      job: {
        id: job.id,
        productId: job.productId,
        status: job.status,
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

    await this.runFatalSideEffect('publishProduct', 'search-index-sync', async () => {
      const productTag = await this.getProductTagsUseCase.execute({ productId: updatedProduct.id });

      await this.publishIndexProductUseCase.execute({
        id: updatedProduct.id,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        summary: updatedProduct.summary,
        description: updatedProduct.description,
        tags: productTag ? productTag.tags.map(tag => tag.name) : [],
        category: updatedProduct.categoryIds[0] ?? '',
        publishedAt: updatedProduct.publishedAt,
      });
    });

    await this.runDegradedSideEffect('publishProduct', 'translation-job-trigger', async () => {
      await this.translationJobService.requestProductTranslationJob(updatedProduct.id);
    });

    return {
      product: updatedProduct,
    };
  }
}
