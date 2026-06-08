import { GetProduct, PublishProduct } from '@darun/products-domain';
import { productNotFound } from '@darun/products-domain';
import { IndexProduct } from '@darun/search-domain';
import { TranslationJobService } from '@darun/translation-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Product } from './graphs/Product';
import { PublishProductInput } from './graphs/PublishProduct';
import { PublishProductPayload } from './graphs/PublishProduct';
import { ProductMediaMutationResolver } from './ProductMediaMutationResolver';

@Resolver(() => Product)
@Service()
export class ProductPublishMutationResolver extends ProductMediaMutationResolver {
  constructor(
    getCompanyUseCase: ProductMediaMutationResolver['getCompanyUseCase'],
    createProductUseCase: ProductMediaMutationResolver['createProductUseCase'],
    editProductUseCase: ProductMediaMutationResolver['editProductUseCase'],
    coreIndexProductUseCase: ProductMediaMutationResolver['indexProductUseCase'],
    updateProductTagUseCase: ProductMediaMutationResolver['updateProductTagUseCase'],
    getProductUseCase: GetProduct,
    addProductScreenshotUseCase: ProductMediaMutationResolver['addProductScreenshotUseCase'],
    deleteProductScreenshotUseCase: ProductMediaMutationResolver['deleteProductScreenshotUseCase'],
    addProductLinkUseCase: ProductMediaMutationResolver['addProductLinkUseCase'],
    updateProductLinkUseCase: ProductMediaMutationResolver['updateProductLinkUseCase'],
    registerProductCompanyUseCase: ProductMediaMutationResolver['registerProductCompanyUseCase'],
    generateProductDescriptionUseCase: ProductMediaMutationResolver['generateProductDescriptionUseCase'],
    protected readonly publishProductUseCase: PublishProduct,
    protected readonly publishIndexProductUseCase: IndexProduct,
    protected readonly translationJobService: TranslationJobService
  ) {
    super(
      createProductUseCase,
      editProductUseCase,
      coreIndexProductUseCase,
      updateProductTagUseCase,
      getProductUseCase,
      getCompanyUseCase,
      addProductScreenshotUseCase,
      deleteProductScreenshotUseCase,
      addProductLinkUseCase,
      updateProductLinkUseCase,
      registerProductCompanyUseCase,
      generateProductDescriptionUseCase
    );
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
      await this.publishIndexProductUseCase.execute({
        id: updatedProduct.id,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        summary: updatedProduct.summary,
        description: updatedProduct.description,
        publishedAt: updatedProduct.publishedAt,
      });
    });

    await this.runDegradedSideEffect('publishProduct', 'translation-job-trigger', async () => {
      await this.translationJobService.translateEntity('Product', updatedProduct.id, [
        'name',
        'summary',
        'description',
      ]);
    });

    return {
      product: updatedProduct,
    };
  }
}
