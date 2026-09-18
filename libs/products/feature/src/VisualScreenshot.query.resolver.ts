import { GetVisualScreenshotById, GetVisualScreenshots, GetVisualScreenshotFlows } from '@darun/products-domain';
import type { VisualScreenshotWithProduct } from '@darun/products-domain';
import { Cursor } from '@darun/utils-apollo-server';
import { Arg, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { VisualFlow } from './graphs/VisualFlow';
import { VisualPlatformGraph } from './graphs/VisualPlatform';
import { VisualScreenshot } from './graphs/VisualScreenshot';
import { VisualScreenshotConnection } from './graphs/VisualScreenshotConnection';
import { VisualScreenTypeGraph } from './graphs/VisualScreenType';

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

function toGraphVisualScreenshot(screenshot: VisualScreenshotWithProduct): VisualScreenshot {
  return {
    id: screenshot.id,
    imageUrl: screenshot.imageUrl,
    imageAlt: screenshot.imageAlt,
    title: screenshot.title ?? null,
    platform: screenshot.platform ?? null,
    screenType: screenshot.screenType ?? null,
    product: {
      id: screenshot.productId,
      name: screenshot.productName,
      slug: screenshot.productSlug,
      summary: screenshot.productSummary,
      logoUrl: screenshot.productLogoUrl,
    },
    // flows는 FieldResolver가 채운다.
    flows: [],
  };
}

@Service()
@Resolver(() => VisualScreenshot)
export class VisualScreenshotQueryResolver {
  constructor(
    private readonly getVisualScreenshotsUseCase: GetVisualScreenshots,
    private readonly getVisualScreenshotByIdUseCase: GetVisualScreenshotById,
    private readonly getVisualScreenshotFlowsUseCase: GetVisualScreenshotFlows
  ) {}

  /**
   * 이 화면을 사용하는 공개 플로. 같은 published_at IS NOT NULL 조건이
   * repository 조회에 적용되므로 비공개 제품 플로는 노출되지 않는다.
   */
  @FieldResolver(() => [VisualFlow])
  public async flows(@Root() screenshot: VisualScreenshot): Promise<VisualFlow[]> {
    const flows = await this.getVisualScreenshotFlowsUseCase.execute({ screenshotId: screenshot.id });
    return flows.map(flow => ({
      id: flow.id,
      title: flow.title,
      description: flow.description,
      platform: flow.platform,
      flowType: flow.flowType,
      product: {
        id: screenshot.product?.id ?? '',
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
    }));
  }

  @Query(() => VisualScreenshotConnection)
  public async visualScreenshots(
    @Arg('query', () => String, { nullable: true }) query?: string | null,
    @Arg('platform', () => VisualPlatformGraph, { nullable: true }) platform?: VisualPlatformGraph | null,
    @Arg('screenType', () => VisualScreenTypeGraph, { nullable: true }) screenType?: VisualScreenTypeGraph | null,
    @Arg('productSlug', () => String, { nullable: true }) productSlug?: string | null,
    @Arg('first', () => Int, { defaultValue: 24 }) first?: number,
    @Arg('after', () => String, { nullable: true }) after?: string | null
  ): Promise<VisualScreenshotConnection> {
    let afterId: string | undefined;
    if (after !== undefined && after !== null && after !== '') {
      const decoded = Cursor.decode(after, ['id'] as const);
      if (!decoded.id || !ULID_PATTERN.test(decoded.id)) {
        throw new Error('pagination/invalid-cursor');
      }
      afterId = decoded.id;
    }

    const { screenshots, totalCount, hasNextPage } = await this.getVisualScreenshotsUseCase.execute({
      query: query ?? null,
      platform: platform ?? null,
      screenType: screenType ?? null,
      productSlug: productSlug ?? null,
      first: first ?? 24,
      afterId,
    });

    const edges = screenshots.map(screenshot => {
      const node = toGraphVisualScreenshot(screenshot);
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

  @Query(() => VisualScreenshot, { nullable: true })
  public async visualScreenshot(@Arg('id', () => String) id: string): Promise<VisualScreenshot | null> {
    const screenshot = await this.getVisualScreenshotByIdUseCase.execute({ id });

    return screenshot ? toGraphVisualScreenshot(screenshot) : null;
  }
}
