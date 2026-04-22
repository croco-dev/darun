import { GetCompany } from '@darun/companies-domain';
import {
  AddProductLink,
  AddProductScreenshot,
  DeleteProductScreenshot,
  GenerateProductDescription,
  GetProduct,
  RegisterProductCompany,
  UpdateProductLink,
} from '@darun/products-domain';
import { productNotFound } from '@darun/products-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
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
import { ProductCoreMutationResolver } from './ProductCoreMutationResolver';

@Resolver(() => Product)
@Service()
export class ProductMediaMutationResolver extends ProductCoreMutationResolver {
  protected readonly mutationContracts = {
    addProductScreenshot: 'fatal',
    addProductLink: 'fatal',
    updateProductLink: 'fatal',
    registerProductCompany: 'fatal',
    generateProductDescription: 'fatal',
    deleteProductScreenshot: 'fatal',
  } as const;

  constructor(
    createProductUseCase: ProductCoreMutationResolver['createProductUseCase'],
    editProductUseCase: ProductCoreMutationResolver['editProductUseCase'],
    indexProductUseCase: ProductCoreMutationResolver['indexProductUseCase'],
    updateProductTagUseCase: ProductCoreMutationResolver['updateProductTagUseCase'],
    getProductUseCase: GetProduct,
    protected readonly getCompanyUseCase: GetCompany,
    protected readonly addProductScreenshotUseCase: AddProductScreenshot,
    protected readonly deleteProductScreenshotUseCase: DeleteProductScreenshot,
    protected readonly addProductLinkUseCase: AddProductLink,
    protected readonly updateProductLinkUseCase: UpdateProductLink,
    protected readonly registerProductCompanyUseCase: RegisterProductCompany,
    protected readonly generateProductDescriptionUseCase: GenerateProductDescription
  ) {
    super(createProductUseCase, editProductUseCase, indexProductUseCase, updateProductTagUseCase, getProductUseCase);
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
    });

    return {
      product: await this.getProductUseCase.execute({ slug }),
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
      throw new Error('Company not found');
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
    const product = await this.getProductUseCase.execute({ slug: input.slug });

    if (!product) {
      throw productNotFound();
    }

    const updatedProduct = await this.generateProductDescriptionUseCase.execute({
      productId: product.id,
    });

    return {
      product: updatedProduct,
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
