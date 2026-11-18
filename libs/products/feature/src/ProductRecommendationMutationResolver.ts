import { GetProduct } from '@darun/products-domain';
import { productNotFound } from '@darun/products-domain';
import { UpdateAlternativeProduct } from '@darun/recommendation-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Product } from './graphs/Product';
import { SetProductAlternativeExclusionInput } from './graphs/ProductAlternativeManagement';
import { UpdateAlternativeProductInput } from './graphs/UpdateAlternativeProduct';
import { UpdateAlternativeProductPayload } from './graphs/UpdateAlternativeProduct';
import { ProductPublishMutationResolver } from './ProductPublishMutationResolver';

@Resolver(() => Product)
export class ProductRecommendationMutationResolver extends ProductPublishMutationResolver {
  constructor(
    getCompanyUseCase: ProductPublishMutationResolver['getCompanyUseCase'],
    createProductUseCase: ProductPublishMutationResolver['createProductUseCase'],
    editProductUseCase: ProductPublishMutationResolver['editProductUseCase'],
    updateProductTagUseCase: ProductPublishMutationResolver['updateProductTagUseCase'],
    getProductUseCase: GetProduct,
    getProductTagsUseCase: ProductPublishMutationResolver['getProductTagsUseCase'],
    addProductScreenshotUseCase: ProductPublishMutationResolver['addProductScreenshotUseCase'],
    deleteProductScreenshotUseCase: ProductPublishMutationResolver['deleteProductScreenshotUseCase'],
    addProductLinkUseCase: ProductPublishMutationResolver['addProductLinkUseCase'],
    updateProductLinkUseCase: ProductPublishMutationResolver['updateProductLinkUseCase'],
    updateProductScreenshotUseCase: ProductPublishMutationResolver['updateProductScreenshotUseCase'],
    registerProductCompanyUseCase: ProductPublishMutationResolver['registerProductCompanyUseCase'],
    generateProductDescriptionUseCase: ProductPublishMutationResolver['generateProductDescriptionUseCase'],
    publishProductUseCase: ProductPublishMutationResolver['publishProductUseCase'],
    protected readonly updateAlternativeProductUseCase: UpdateAlternativeProduct,
    applyProductDescriptionCandidateUseCase?: ProductPublishMutationResolver['applyProductDescriptionCandidateUseCase'],
    productDescriptionJobService?: ProductPublishMutationResolver['productDescriptionJobService']
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
      applyProductDescriptionCandidateUseCase,
      productDescriptionJobService
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

  @Authorized([AuthRole.Admin])
  @Mutation(() => Boolean)
  async setProductAlternativeExclusion(@Arg('input') input: SetProductAlternativeExclusionInput): Promise<boolean> {
    const source = await this.getProductUseCase.execute({ slug: input.slug });
    if (!source) throw productNotFound();

    if (input.excluded) {
      const target = await this.getProductUseCase.execute({ id: input.alternativeProductId });
      if (!target) throw productNotFound();
      await this.updateAlternativeProductUseCase.exclude(source.id, target.id, input.note ?? null);
    } else {
      await this.updateAlternativeProductUseCase.restore(source.id, input.alternativeProductId);
    }
    return true;
  }
}
