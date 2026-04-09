import type { GetCompany } from '@darun/companies-domain';
import type {
  AddProductLink,
  AddProductScreenshot,
  CreateProduct,
  EditProduct,
  GenerateProductDescription,
  GetProduct,
  GetPublishedProduct,
  PublishProduct,
  RegisterProductCompany,
  UpdateProductLink,
  UpdateProductTag,
} from '@darun/products-domain';
import { productNotFound } from '@darun/products-domain';
import type { UpdateAlternativeProduct } from '@darun/recommendation-domain';
import type { IndexProduct } from '@darun/search-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import type { GraphQLContext } from '@darun/utils-apollo-server/src/libs/GraphQLContext';
import type { UpvoteProduct } from '@darun/voting-domain';
import { Arg, Ctx, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import type { AddProductLinkInput } from './graphs/AddProductLink';
import { AddProductLinkPayload } from './graphs/AddProductLink';
import type { AddProductScreenshotInput } from './graphs/AddProductScreenshot';
import { AddProductScreenshotPayload } from './graphs/AddProductScreenshot';
import type { CreateProductInput } from './graphs/CreateProduct';
import { CreateProductPayload } from './graphs/CreateProduct';
import type { EditProductInput } from './graphs/EditProduct';
import { EditProductPayload } from './graphs/EditProduct';
import type { GenerateProductDescriptionInput } from './graphs/GenerateProductDescription';
import { GenerateProductDescriptionPayload } from './graphs/GenerateProductDescription';
import type { IndexProductInput } from './graphs/IndexProduct';
import { IndexProductPayload } from './graphs/IndexProduct';
import { Product } from './graphs/Product';
import type { PublishProductInput } from './graphs/PublishProduct';
import { PublishProductPayload } from './graphs/PublishProduct';
import type { RegisterProductCompanyInput } from './graphs/RegisterProductCompany';
import { RegisterProductCompanyPayload } from './graphs/RegisterProductCompany';
import type { UpdateAlternativeProductInput } from './graphs/UpdateAlternativeProduct';
import { UpdateAlternativeProductPayload } from './graphs/UpdateAlternativeProduct';
import type { UpdateProductLinkInput } from './graphs/UpdateProductLink';
import { UpdateProductLinkPayload } from './graphs/UpdateProductLink';
import type { UpdateProductTagsInput } from './graphs/UpdateProductTags';
import { UpdateProductTagsPayload } from './graphs/UpdateProductTags';
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
    private readonly updateProductLinkUseCase: UpdateProductLink,
    private readonly updateAlternativeProductUseCase: UpdateAlternativeProduct,
    private readonly upvoteProductUseCase: UpvoteProduct,
    private readonly registerProductCompanyUseCase: RegisterProductCompany,
    private readonly generateProductDescriptionUseCase: GenerateProductDescription
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
      throw productNotFound();
    }

    return {
      product: await this.editProductUseCase.execute({
        ...input,
        id: product.id,
      }),
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
    const product = await this.getPublishedProductUseCase.execute({
      slug: input.slug,
    });

    if (!product) {
      throw productNotFound();
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
      throw productNotFound();
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
  @Mutation(() => UpdateAlternativeProductPayload)
  async updateAlternativeProduct(
    @Arg('slug') slug: string,
    @Arg('input') input: UpdateAlternativeProductInput
  ): Promise<UpdateAlternativeProductPayload> {
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      throw productNotFound();
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
  async upvoteProduct(@Arg('slug') slug: string, @Ctx() ctx: GraphQLContext): Promise<UpvoteProductPayload> {
    const product = await this.getPublishedProductUseCase.execute({ slug });

    if (!product) {
      throw productNotFound();
    }

    await this.upvoteProductUseCase.execute({
      productId: product.id,
      voterIp: ctx.clientIp ?? 'unknown',
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
}
