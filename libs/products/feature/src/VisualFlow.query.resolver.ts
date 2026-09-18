import type { VisualFlowDetail, VisualFlowSummary } from '@darun/products-domain';
import {
  GetAdminProductFlow,
  GetAdminProductFlows,
  GetProductScreenshots,
  GetVisualFlows,
  GetVisualFlowById,
  GetVisualScreenshotFlows,
} from '@darun/products-domain';
import { AuthRole, Cursor } from '@darun/utils-apollo-server';
import { Arg, Authorized, Int, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { VisualFlow } from './graphs/VisualFlow';
import { VisualFlowConnection } from './graphs/VisualFlowConnection';
import { VisualFlowTypeGraph } from './graphs/VisualFlowType';
import { VisualPlatformGraph } from './graphs/VisualPlatform';
import { toGraphFlowFromSaved } from './VisualFlow.mapper';

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

// 제품 정보는 flow row에서 매핑한다. 목록 GraphQL 선택은 cover와 stepCount만 사용하고
// 전체 steps는 상세에서 요청한다.
function toGraphVisualFlow(flow: VisualFlowSummary): VisualFlow {
  return {
    id: flow.id,
    title: flow.title,
    description: flow.description,
    platform: flow.platform,
    flowType: flow.flowType,
    product: {
      id: flow.productId,
      name: flow.productName,
      slug: flow.productSlug,
      logoUrl: '',
      summary: '',
    },
    coverScreenshot: {
      id: flow.coverScreenshot.id,
      imageUrl: flow.coverScreenshot.imageUrl,
      imageAlt: flow.coverScreenshot.imageAlt,
    },
    stepCount: flow.stepCount,
    steps: [],
  };
}

@Service()
@Resolver(() => VisualFlow)
export class VisualFlowQueryResolver {
  constructor(
    private readonly getVisualFlowsUseCase: GetVisualFlows,
    private readonly getVisualFlowByIdUseCase: GetVisualFlowById,
    private readonly getAdminProductFlowsUseCase: GetAdminProductFlows,
    private readonly getAdminProductFlowUseCase: GetAdminProductFlow,
    private readonly getVisualScreenshotFlowsUseCase: GetVisualScreenshotFlows,
    private readonly getProductScreenshotsUseCase: GetProductScreenshots
  ) {}

  /**
   * 관리자 편집용 매핑: 제품 공개 여부와 무관하게 단계 화면 정보까지
   * 함께 반환한다.
   */
  private toGraphFlowDetail(flow: VisualFlowDetail): VisualFlow {
    const cover = flow.steps[0]?.screenshot;
    if (!cover) {
      throw new Error('product-flow/invalid-args');
    }
    return {
      id: flow.id,
      title: flow.title,
      description: flow.description,
      platform: flow.platform,
      flowType: flow.flowType,
      product: {
        id: flow.productId,
        name: flow.productName,
        slug: flow.productSlug,
        logoUrl: '',
        summary: '',
      },
      coverScreenshot: {
        id: cover.id,
        imageUrl: cover.imageUrl,
        imageAlt: cover.imageAlt,
        title: cover.title,
      },
      stepCount: flow.steps.length,
      steps: flow.steps.map(step => ({
        position: step.position,
        caption: step.caption,
        screenshot: {
          id: step.screenshot.id,
          imageUrl: step.screenshot.imageUrl,
          imageAlt: step.screenshot.imageAlt,
          title: step.screenshot.title,
        },
      })),
    };
  }

  @Query(() => VisualFlowConnection)
  public async visualFlows(
    @Arg('query', () => String, { nullable: true }) query?: string | null,
    @Arg('platform', () => VisualPlatformGraph, { nullable: true }) platform?: VisualPlatformGraph | null,
    @Arg('flowType', () => VisualFlowTypeGraph, { nullable: true }) flowType?: VisualFlowTypeGraph | null,
    @Arg('productSlug', () => String, { nullable: true }) productSlug?: string | null,
    @Arg('first', () => Int, { defaultValue: 24 }) first?: number,
    @Arg('after', () => String, { nullable: true }) after?: string | null
  ): Promise<VisualFlowConnection> {
    let afterId: string | undefined;
    if (after !== undefined && after !== null && after !== '') {
      const decoded = Cursor.decode(after, ['id'] as const);
      if (!decoded.id || !ULID_PATTERN.test(decoded.id)) {
        throw new Error('pagination/invalid-cursor');
      }
      afterId = decoded.id;
    }

    const { flows, totalCount, hasNextPage } = await this.getVisualFlowsUseCase.execute({
      query: query ?? null,
      platform: platform ?? null,
      flowType: flowType ?? null,
      productSlug: productSlug ?? null,
      first: first ?? 24,
      afterId,
    });

    const edges = flows.map(flow => {
      const node = toGraphVisualFlow(flow);
      return {
        node,
        cursor: Cursor.encode(node, ['id'] as const),
      };
    });

    return {
      totalCount,
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: afterId !== undefined,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    };
  }

  @Authorized([AuthRole.Admin])
  @Query(() => [VisualFlow])
  public async adminProductFlows(@Arg('productSlug', () => String) productSlug: string): Promise<VisualFlow[]> {
    const result = await this.getAdminProductFlowsUseCase.execute({ productSlug });
    if (!result) {
      return [];
    }
    const { product, flows } = result;
    if (flows.length === 0) {
      return [];
    }
    // 같은 제품의 플로이므로 화면 목록은 한 번만 조회해 조합한다.
    const screenshots = await this.getProductScreenshotsUseCase.execute({ productId: product.id });
    return flows.map(flow => toGraphFlowFromSaved(flow, product, screenshots));
  }

  @Authorized([AuthRole.Admin])
  @Query(() => VisualFlow, { nullable: true })
  public async adminProductFlow(@Arg('id', () => String) id: string): Promise<VisualFlow | null> {
    const flow = await this.getAdminProductFlowUseCase.execute({ id });
    return flow ? this.toGraphFlowDetail(flow) : null;
  }

  @Query(() => VisualFlow, { nullable: true })
  public async visualFlow(@Arg('id', () => String) id: string): Promise<VisualFlow | null> {
    const flow = await this.getVisualFlowByIdUseCase.execute({ id });

    if (!flow) {
      return null;
    }

    return {
      id: flow.id,
      title: flow.title,
      description: flow.description,
      platform: flow.platform,
      flowType: flow.flowType,
      product: {
        id: flow.productId,
        name: flow.productName,
        slug: flow.productSlug,
        logoUrl: '',
        summary: '',
      },
      coverScreenshot: {
        id: flow.steps[0]?.screenshot.id ?? '',
        imageUrl: flow.steps[0]?.screenshot.imageUrl ?? '',
        imageAlt: flow.steps[0]?.screenshot.imageAlt ?? '',
        title: flow.steps[0]?.screenshot.title ?? null,
      },
      stepCount: flow.steps.length,
      steps: flow.steps.map(step => ({
        position: step.position,
        caption: step.caption,
        screenshot: {
          id: step.screenshot.id,
          imageUrl: step.screenshot.imageUrl,
          imageAlt: step.screenshot.imageAlt,
          title: step.screenshot.title,
        },
      })),
    };
  }
}
