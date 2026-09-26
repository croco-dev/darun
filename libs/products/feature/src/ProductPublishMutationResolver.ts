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

  protected async syncPublishedContent(product: Product): Promise<void> {
    if (product.publishedAt === undefined) {
      return;
    }

    await this.runDegradedSideEffect('syncPublishedContent', 'search-index-sync', async () => {
      const [productTag, domainProduct] = await Promise.all([
        this.getProductTagsUseCase.execute({ productId: product.id }),
        this.getProductUseCase.execute({ slug: product.slug }),
      ]);

      await this.publishIndexProductUseCase.execute({
        id: product.id,
        name: product.name,
        slug: product.slug,
        summary: product.summary,
        description: product.description,
        tags: productTag ? productTag.tags.map(tag => tag.name) : [],
        category: domainProduct?.categoryIds[0] ?? '',
        publishedAt: product.publishedAt,
      });
    });

    await this.runDegradedSideEffect('syncPublishedContent', 'translation-job-trigger', async () => {
      await this.translationJobService.translateProductWithFeatures(product.id);
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
        await this.syncPublishedContent(updatedProduct);
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
      await this.translationJobService.translateProductWithFeatures(updatedProduct.id);
    });

    return {
      product: updatedProduct,
    };
  }
}
