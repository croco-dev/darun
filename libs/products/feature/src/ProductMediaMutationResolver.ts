import { GetCompany } from '@darun/companies-domain';
import {
  AddProductLink,
  AddProductScreenshot,
  DeleteProductScreenshot,
  GenerateProductDescription,
  GetProduct,
  RegisterProductCompany,
  UpdateProductLink,
  UpdateProductScreenshot,
  productNotFound,
  productCompanyNotFound,
} from '@darun/products-domain';
import { ProductDescriptionJobService } from '@darun/products-service';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { AddProductLinkInput } from './graphs/AddProductLink';
import { AddProductLinkPayload } from './graphs/AddProductLink';
import { AddProductScreenshotInput } from './graphs/AddProductScreenshot';
import { AddProductScreenshotPayload } from './graphs/AddProductScreenshot';
import { DeleteProductScreenshotPayload } from './graphs/DeleteProductScreenshot';
import { GenerateProductDescriptionInput } from './graphs/GenerateProductDescription';
import { GenerateProductDescriptionPayload } from './graphs/GenerateProductDescription';
import { Product } from './graphs/Product';
import { RegisterProductCompanyInput } from './graphs/RegisterProductCompany';
import { RegisterProductCompanyPayload } from './graphs/RegisterProductCompany';
import { UpdateProductLinkInput } from './graphs/UpdateProductLink';
import { UpdateProductLinkPayload } from './graphs/UpdateProductLink';
import { UpdateProductScreenshotInput } from './graphs/UpdateProductScreenshot';
import { UpdateProductScreenshotPayload } from './graphs/UpdateProductScreenshot';
import { ProductCoreMutationResolver } from './ProductCoreMutationResolver';

@Resolver(() => Product)
export class ProductMediaMutationResolver extends ProductCoreMutationResolver {
  protected readonly mutationContracts = {
    addProductScreenshot: 'fatal',
    addProductLink: 'fatal',
    updateProductLink: 'fatal',
    registerProductCompany: 'fatal',
    generateProductDescription: 'fatal',
    deleteProductScreenshot: 'fatal',
    updateProductScreenshot: 'fatal',
  } as const;

  constructor(
    createProductUseCase: ProductCoreMutationResolver['createProductUseCase'],
    editProductUseCase: ProductCoreMutationResolver['editProductUseCase'],
    indexProductUseCase: ProductCoreMutationResolver['indexProductUseCase'],
    updateProductTagUseCase: ProductCoreMutationResolver['updateProductTagUseCase'],
    getProductUseCase: GetProduct,
    getProductTagsUseCase: ProductCoreMutationResolver['getProductTagsUseCase'],
    protected readonly getCompanyUseCase: GetCompany,
    protected readonly addProductScreenshotUseCase: AddProductScreenshot,
    protected readonly deleteProductScreenshotUseCase: DeleteProductScreenshot,
    protected readonly addProductLinkUseCase: AddProductLink,
    protected readonly updateProductLinkUseCase: UpdateProductLink,
    protected readonly updateProductScreenshotUseCase: UpdateProductScreenshot,
    protected readonly registerProductCompanyUseCase: RegisterProductCompany,
    protected readonly generateProductDescriptionUseCase: GenerateProductDescription,
    protected readonly productDescriptionJobService?: ProductDescriptionJobService
  ) {
    super(
      createProductUseCase,
      editProductUseCase,
      indexProductUseCase,
      updateProductTagUseCase,
      getProductUseCase,
      getProductTagsUseCase
    );
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => AddProductScreenshotPayload)
  async addProductScreenshot(
    @Arg('slug') slug: string,
    @Arg('input') input: AddProductScreenshotInput
  ): Promise<AddProductScreenshotPayload> {
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      throw productNotFound();
    }

    await this.addProductScreenshotUseCase.execute({
      productId: product.id,
      imageUrl: input.imageUrl,
      imageAlt: input.imageAlt,
      title: input.title ?? null,
      platform: input.platform ?? null,
      screenType: input.screenType ?? null,
    });

    return {
      product: await this.getProductUseCase.execute({ slug }),
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => UpdateProductScreenshotPayload)
  async updateProductScreenshot(
    @Arg('input') input: UpdateProductScreenshotInput
  ): Promise<UpdateProductScreenshotPayload> {
    const screenshot = await this.updateProductScreenshotUseCase.execute({
      id: input.id,
      imageAlt: input.imageAlt,
      title: input.title ?? null,
      platform: input.platform ?? null,
      screenType: input.screenType ?? null,
    });

    return {
      screenshot,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => AddProductLinkPayload)
  async addProductLink(
    @Arg('slug') slug: string,
    @Arg('input') input: AddProductLinkInput
  ): Promise<AddProductLinkPayload> {
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      throw productNotFound();
    }

    await this.addProductLinkUseCase.execute({
      ...input,
      productId: product.id,
    });

    return {
      product: await this.getProductUseCase.execute({ slug }),
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => UpdateProductLinkPayload)
  async updateProductLink(
    @Arg('slug') slug: string,
    @Arg('id') id: string,
    @Arg('input') input: UpdateProductLinkInput
  ): Promise<UpdateProductLinkPayload> {
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      throw productNotFound();
    }

    await this.updateProductLinkUseCase.execute({ linkId: id, ...input });

    return {
      product: await this.getProductUseCase.execute({ slug }),
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => RegisterProductCompanyPayload)
  async registerProductCompany(
    @Arg('slug') slug: string,
    @Arg('input') input: RegisterProductCompanyInput
  ): Promise<RegisterProductCompanyPayload> {
    const product = await this.getProductUseCase.execute({ slug });
    const company = await this.getCompanyUseCase.execute({
      id: input.companyId,
    });

    if (!product) {
      throw productNotFound();
    }

    if (!company) {
      throw productCompanyNotFound();
    }

    await this.registerProductCompanyUseCase.execute({
      productId: product.id,
      companyId: company.id,
    });

    return {
      product: await this.getProductUseCase.execute({ slug }),
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => GenerateProductDescriptionPayload)
  async generateProductDescription(
    @Arg('input') input: GenerateProductDescriptionInput
  ): Promise<GenerateProductDescriptionPayload> {
    if (this.productDescriptionJobService) {
      const { product, job } = await this.productDescriptionJobService.requestProductDescriptionJob({
        slug: input.slug,
      });

      return {
        product,
        job: {
          id: job.id,
          productId: job.productId,
          status: job.status,
          message: job.message ?? undefined,
          error: job.error ?? undefined,
        },
      };
    }

    const product = await this.getProductUseCase.execute({ slug: input.slug });

    if (!product) {
      throw productNotFound();
    }

    const updatedProduct = await this.generateProductDescriptionUseCase.execute({
      productId: product.id,
    });

    return {
      product: updatedProduct,
      job: {
        id: updatedProduct.id,
        productId: updatedProduct.id,
        status: 'completed',
        message: 'AI 소개 생성이 완료되었습니다.',
      },
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => DeleteProductScreenshotPayload)
  async deleteProductScreenshot(@Arg('id') id: string): Promise<DeleteProductScreenshotPayload> {
    await this.deleteProductScreenshotUseCase.execute(id);

    return {
      success: true,
    };
  }
}
