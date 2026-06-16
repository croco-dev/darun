import { GetProduct } from '@darun/products-domain';
import { productNotFound } from '@darun/products-domain';
import { UpdateAlternativeProduct } from '@darun/recommendation-domain';
import { IndexProduct } from '@darun/search-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Product } from './graphs/Product';
import { UpdateAlternativeProductInput } from './graphs/UpdateAlternativeProduct';
import { UpdateAlternativeProductPayload } from './graphs/UpdateAlternativeProduct';
import { ProductPublishMutationResolver } from './ProductPublishMutationResolver';

@Resolver(() => Product)
@Service()
export class ProductRecommendationMutationResolver extends ProductPublishMutationResolver {
  constructor(
    getCompanyUseCase: ProductPublishMutationResolver['getCompanyUseCase'],
    createProductUseCase: ProductPublishMutationResolver['createProductUseCase'],
    editProductUseCase: ProductPublishMutationResolver['editProductUseCase'],
    coreIndexProductUseCase: ProductPublishMutationResolver['indexProductUseCase'],
    updateProductTagUseCase: ProductPublishMutationResolver['updateProductTagUseCase'],
    getProductUseCase: GetProduct,
    getProductTagsUseCase: ProductPublishMutationResolver['getProductTagsUseCase'],
    addProductScreenshotUseCase: ProductPublishMutationResolver['addProductScreenshotUseCase'],
    deleteProductScreenshotUseCase: ProductPublishMutationResolver['deleteProductScreenshotUseCase'],
    addProductLinkUseCase: ProductPublishMutationResolver['addProductLinkUseCase'],
    updateProductLinkUseCase: ProductPublishMutationResolver['updateProductLinkUseCase'],
    registerProductCompanyUseCase: ProductPublishMutationResolver['registerProductCompanyUseCase'],
    generateProductDescriptionUseCase: ProductPublishMutationResolver['generateProductDescriptionUseCase'],
    publishProductUseCase: ProductPublishMutationResolver['publishProductUseCase'],
    publishIndexProductUseCase: IndexProduct,
    translationJobService: ProductPublishMutationResolver['translationJobService'],
    protected readonly updateAlternativeProductUseCase: UpdateAlternativeProduct
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
      translationJobService
    );
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => UpdateAlternativeProductPayload)
  async updateAlternativeProduct(
    @Arg('slug') slug: string,
    @Arg('input') input: UpdateAlternativeProductInput
  ): Promise<UpdateAlternativeProductPayload> {
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      throw productNotFound();
    }

    await this.runFatalSideEffect('updateAlternativeProduct', 'alternative-product-sync', async () => {
      await this.updateAlternativeProductUseCase.execute({
        alternativeProductIds: input.alternativeProductIds,
        productId: product.id,
      });
    });

    return {
      product: await this.getProductUseCase.execute({ slug }),
    };
  }
}
