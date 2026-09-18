import {
  CreateProductFlow,
  DeleteProductFlow,
  GetProduct,
  GetProductScreenshots,
  UpdateProductFlow,
  productFlowWritesDisabled,
  productNotFound,
} from '@darun/products-domain';
import type { Product, ProductFlow } from '@darun/products-domain';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import {
  CreateProductFlowInput,
  CreateProductFlowPayload,
  DeleteProductFlowInput,
  DeleteProductFlowPayload,
  UpdateProductFlowInput,
  UpdateProductFlowPayload,
} from './graphs/ProductFlowMutation';
import { VisualFlow } from './graphs/VisualFlow';
import { toGraphFlowFromSaved } from './VisualFlow.mapper';

/**
 * 플로 쓰기는 VISUAL_FLOW_WRITES_ENABLED가 정확히 문자열 'true'일 때만 허용한다.
 * 누락·false·오타는 Admin 검사 뒤 DB 작업 전에 product-flow/writes-disabled로 거절한다.
 */
function assertFlowWritesEnabled(): void {
  if (process.env['VISUAL_FLOW_WRITES_ENABLED'] !== 'true') {
    throw productFlowWritesDisabled();
  }
}

@Service()
@Resolver(() => VisualFlow)
export class ProductFlowMutationResolver {
  constructor(
    private readonly getProductUseCase: GetProduct,
    private readonly getProductScreenshotsUseCase: GetProductScreenshots,
    private readonly createProductFlowUseCase: CreateProductFlow,
    private readonly updateProductFlowUseCase: UpdateProductFlow,
    private readonly deleteProductFlowUseCase: DeleteProductFlow
  ) {}

  @Authorized([AuthRole.Admin])
  @Mutation(() => CreateProductFlowPayload)
  async createProductFlow(@Arg('input') input: CreateProductFlowInput): Promise<CreateProductFlowPayload> {
    assertFlowWritesEnabled();

    const product = await this.getProductUseCase.execute({ slug: input.productSlug });
    if (!product) {
      throw productNotFound();
    }

    const savedFlow = await this.createProductFlowUseCase.execute({
      productId: product.id,
      title: input.title,
      description: input.description,
      platform: input.platform,
      flowType: input.flowType,
      steps: input.steps.map(step => ({ screenshotId: step.screenshotId, caption: step.caption })),
    });

    return { flow: await this.toGraphFlow(savedFlow, product) };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => UpdateProductFlowPayload)
  async updateProductFlow(@Arg('input') input: UpdateProductFlowInput): Promise<UpdateProductFlowPayload> {
    assertFlowWritesEnabled();

    const savedFlow = await this.updateProductFlowUseCase.execute({
      id: input.id,
      title: input.title,
      description: input.description,
      platform: input.platform,
      flowType: input.flowType,
      steps: input.steps.map(step => ({ screenshotId: step.screenshotId, caption: step.caption })),
    });

    const product = await this.getProductUseCase.execute({ id: savedFlow.productId });
    if (!product) {
      throw productNotFound();
    }

    return { flow: await this.toGraphFlow(savedFlow, product) };
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => DeleteProductFlowPayload)
  async deleteProductFlow(@Arg('input') input: DeleteProductFlowInput): Promise<DeleteProductFlowPayload> {
    assertFlowWritesEnabled();

    await this.deleteProductFlowUseCase.execute(input.id);

    return { success: true };
  }

  private async toGraphFlow(savedFlow: ProductFlow, product: Product): Promise<VisualFlow> {
    const screenshots = await this.getProductScreenshotsUseCase.execute({ productId: product.id });
    return toGraphFlowFromSaved(savedFlow, product, screenshots);
  }
}
