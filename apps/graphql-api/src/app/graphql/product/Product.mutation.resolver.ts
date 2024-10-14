import {
  AddProductScreenshot,
  UpdateProductTag,
  CreateProduct,
  GetProduct,
  GetPublishedProduct,
  IndexProduct,
  AddProductLink,
  PublishProduct,
  UpdateAlternativeProduct,
  EditProduct,
  UpvoteProduct,
  GetCompany,
  RegisterProductCompany,
} from '@darun/backend';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { AddProductLinkInput, AddProductLinkPayload } from './graphs/AddProductLink';
import { AddProductScreenshotInput, AddProductScreenshotPayload } from './graphs/AddProductScreenshot';
import { CreateProductInput, CreateProductPayload } from './graphs/CreateProduct';
import { EditProductInput, EditProductPayload } from './graphs/EditProduct';
import { IndexProductInput, IndexProductPayload } from './graphs/IndexProduct';
import { Product } from './graphs/Product';
import { PublishProductInput, PublishProductPayload } from './graphs/PublishProduct';
import { RegisterProductCompanyInput, RegisterProductCompanyPayload } from './graphs/RegisterProductCompany';
import { UpdateAlternativeProductInput, UpdateAlternativeProductPayload } from './graphs/UpdateAlternativeProduct';
import { UpdateProductTagsInput, UpdateProductTagsPayload } from './graphs/UpdateProductTags';
import { UpvoteProductPayload } from './graphs/UpvoteProduct';

@Resolver(() => Product)
@Service()
export class ProductMutationResolver {
  constructor(
    private readonly createProductUseCase: CreateProduct,
    private readonly getCompanyUseCase: GetCompany,
    private readonly editProductUseCase: EditProduct,
    private readonly indexProductUseCase: IndexProduct,
    private readonly publishProductUseCase: PublishProduct,
    private readonly updateProductTagUseCase: UpdateProductTag,
    private readonly getPublishedProductUseCase: GetPublishedProduct,
    private readonly getProductUseCase: GetProduct,
    private readonly addProductScreenshotUseCase: AddProductScreenshot,
    private readonly addProductLinkUseCase: AddProductLink,
    private readonly updateAlternativeProductUseCase: UpdateAlternativeProduct,
    private readonly upvoteProductUseCase: UpvoteProduct,
    private readonly registerProductCompanyUseCase: RegisterProductCompany
  ) {}

  @Authorized([AuthRole.Admin])
  @Mutation(() => CreateProductPayload)
  async createProduct(@Arg('input') input: CreateProductInput): Promise<CreateProductPayload> {
    const product = await this.createProductUseCase.execute(input);

    return {
      product,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => EditProductPayload)
  async editProduct(@Arg('slug') slug: string, @Arg('input') input: EditProductInput): Promise<EditProductPayload> {
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      throw new Error('Product가 존재하지 않습니다.');
    }

    return {
      product: await this.editProductUseCase.execute({ ...input, id: product.id }),
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => PublishProductPayload)
  async publishProduct(@Arg('input') input: PublishProductInput): Promise<PublishProductPayload> {
    const product = await this.getProductUseCase.execute({ slug: input.slug });

    if (!product) {
      throw new Error('Product가 존재하지 않습니다.');
    }

    const updatedProduct = await this.publishProductUseCase.execute({
      id: product.id,
    });

    await this.indexProductUseCase.execute({
      id: updatedProduct.id,
      name: updatedProduct.name,
      slug: updatedProduct.slug,
      summary: updatedProduct.summary,
      description: updatedProduct.description,
    });

    return {
      product: updatedProduct,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => IndexProductPayload)
  async indexProduct(@Arg('input') input: IndexProductInput): Promise<IndexProductPayload> {
    const product = await this.getPublishedProductUseCase.execute({ slug: input.slug });

    if (!product) {
      throw new Error('publish된 Product가 존재하지 않습니다.');
    }

    const indexed = await this.indexProductUseCase.execute({
      id: product.id,
      name: product.name,
      slug: product.slug,
      summary: product.summary,
      description: product.description,
    });

    return {
      indexed,
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => UpdateProductTagsPayload)
  async updateProductTags(
    @Arg('slug') slug: string,
    @Arg('input') input: UpdateProductTagsInput
  ): Promise<UpdateProductTagsPayload> {
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      throw new Error('Product not found');
    }

    await this.updateProductTagUseCase.execute({
      productId: product.id,
      tagNames: input.tagNames,
    });

    return {
      product: await this.getProductUseCase.execute({ slug }),
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => AddProductScreenshotPayload)
  async addProductScreenshot(
    @Arg('slug') slug: string,
    @Arg('input') input: AddProductScreenshotInput
  ): Promise<AddProductScreenshotPayload> {
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      throw new Error('Product not found');
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
      throw new Error('Product not found');
    }

    await this.addProductLinkUseCase.execute({ ...input, productId: product.id });

    return {
      product: await this.getProductUseCase.execute({ slug }),
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => UpdateAlternativeProductPayload)
  async updateAlternativeProduct(
    @Arg('slug') slug: string,
    @Arg('input') input: UpdateAlternativeProductInput
  ): Promise<AddProductLinkPayload> {
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      throw new Error('Product not found');
    }

    await this.updateAlternativeProductUseCase.execute({
      alternativeProductIds: input.alternativeProductIds,
      productId: product.id,
    });

    return {
      product: await this.getProductUseCase.execute({ slug }),
    };
  }

  @Mutation(() => UpvoteProductPayload)
  async upvoteProduct(@Arg('slug') slug: string): Promise<UpvoteProductPayload> {
    const product = await this.getPublishedProductUseCase.execute({ slug });

    if (!product) {
      throw new Error('publish된 Product가 존재하지 않습니다.');
    }

    await this.upvoteProductUseCase.execute({
      productId: product.id,
    });

    return {
      product: await this.getPublishedProductUseCase.execute({ slug }),
    };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => RegisterProductCompanyPayload)
  async registerProductCompany(
    @Arg('slug') slug: string,
    @Arg('input') input: RegisterProductCompanyInput
  ): Promise<RegisterProductCompanyPayload> {
    const product = await this.getProductUseCase.execute({ slug });
    const company = await this.getCompanyUseCase.execute({ id: input.companyId });
    if (!product) {
      throw new Error('Product not found');
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
}
