import { CreateProduct, EditProduct, GetProduct, GetProductTags, UpdateProductTag } from '@darun/products-domain';
import { productDescriptionInvalidEditPrecondition, productNotFound } from '@darun/products-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { CreateProductInput } from './graphs/CreateProduct';
import { CreateProductPayload } from './graphs/CreateProduct';
import { EditProductInput } from './graphs/EditProduct';
import { EditProductPayload } from './graphs/EditProduct';
import { Product } from './graphs/Product';
import { UpdateProductTagsInput } from './graphs/UpdateProductTags';
import { UpdateProductTagsPayload } from './graphs/UpdateProductTags';

type SideEffectFailureSeverity = 'fatal' | 'degraded';
type SideEffectLogLevel = 'error' | 'warn' | 'info';
type SideEffectReturnPath = 'throw' | 'omit';

type SideEffectFailureContext = {
  mutationName: string;
  sideEffectName: string;
  severity: SideEffectFailureSeverity;
  logLevel: SideEffectLogLevel;
  returnPath: SideEffectReturnPath;
  error: unknown;
};

@Resolver(() => Product)
export class ProductCoreMutationResolver {
  constructor(
    protected readonly createProductUseCase: CreateProduct,
    protected readonly editProductUseCase: EditProduct,
    protected readonly updateProductTagUseCase: UpdateProductTag,
    protected readonly getProductUseCase: GetProduct,
    protected readonly getProductTagsUseCase: GetProductTags
  ) {}

  protected async runFatalSideEffect<T>(
    mutationName: string,
    sideEffectName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logSideEffectFailure({
        mutationName,
        sideEffectName,
        severity: 'fatal',
        logLevel: 'error',
        returnPath: 'throw',
        error,
      });

      throw error;
    }
  }

  private logSideEffectFailure(context: SideEffectFailureContext): void {
    const message =
      `[products] ${context.mutationName} side effect contract violated: ` +
      `${context.sideEffectName} severity=${context.severity} ` +
      `logLevel=${context.logLevel} returnPath=${context.returnPath}`;

    if (context.logLevel === 'error') {
      console.error(message, context.error);

      return;
    }

    if (context.logLevel === 'warn') {
      console.warn(message, context.error);

      return;
    }

    console.info(message, context.error);
  }

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
  async editProduct(
    @Arg('slug') slug: string,
    @Arg('input') input: EditProductInput,
    @Ctx() context?: { expectedDescriptionHash?: unknown }
  ): Promise<EditProductPayload> {
    const expectedDescriptionHash = input.description === undefined ? undefined : context?.expectedDescriptionHash;
    if (
      expectedDescriptionHash != null &&
      (typeof expectedDescriptionHash !== 'string' || !/^[0-9a-f]{64}$/.test(expectedDescriptionHash))
    ) {
      throw productDescriptionInvalidEditPrecondition();
    }
    const product = await this.getProductUseCase.execute({ slug });

    if (!product) {
      throw productNotFound();
    }

    const updatedProduct = await this.editProductUseCase.execute({
      ...input,
      id: product.id,
      expectedDescriptionHash,
    });

    return {
      product: updatedProduct,
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
}
