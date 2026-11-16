import {
  GetVisualScreenshotById,
  GetVisualScreenshots,
  GetVisualScreenshotFlows,
  productInvalidArgs,
} from '@darun/products-domain';
import type { VisualScreenshotWithProduct } from '@darun/products-domain';
import { Cursor } from '@darun/utils-apollo-server';
import { Arg, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { VisualPlatformGraph } from './graphs/VisualPlatform';
import { VisualScreenshot } from './graphs/VisualScreenshot';
import { VisualScreenshotConnection } from './graphs/VisualScreenshotConnection';
import { VisualScreenshotFlowConnection } from './graphs/VisualScreenshotFlowConnection';
import { VisualScreenTypeGraph } from './graphs/VisualScreenType';
import { VisualSortGraph } from './graphs/VisualSort';
import { VisualUiElementGraph } from './graphs/VisualUiElement';

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;
// The encoded cursor contains two IDs of up to 26 characters and the signed envelope.
const MAX_SCREENSHOT_FLOW_CURSOR_LENGTH = 512;

/**
 * M4 내 저장 목록 매핑 공용. 저장 카드 connection의 node 변환을
 * 탐색 resolver와 공유해 Sonar 중복 게이트를 피한다.
 */
export function toGraphVisualScreenshot(screenshot: VisualScreenshotWithProduct): VisualScreenshot {
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
  @FieldResolver(() => VisualScreenshotFlowConnection)
  public async flows(
    @Root() screenshot: VisualScreenshot,
    @Arg('first', () => Int, { defaultValue: 8 }) first: number,
    @Arg('after', () => String, { nullable: true }) after?: string | null
  ): Promise<VisualScreenshotFlowConnection> {
    const screenshotId = screenshot.id;
    const afterId = after == null ? undefined : decodeScreenshotFlowCursor(after, screenshotId);
    const { flows, hasNextPage } = await this.getVisualScreenshotFlowsUseCase.execute({ screenshotId, first, afterId });
    const edges = flows.map(node => ({
      node,
      cursor: Cursor.encode({ screenshotId, flowId: node.id }, ['screenshotId', 'flowId']),
    }));
    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: afterId !== undefined,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    };
  }

  @Query(() => VisualScreenshotConnection)
  public async visualScreenshots(
    @Arg('query', () => String, { nullable: true }) query?: string | null,
    @Arg('platform', () => VisualPlatformGraph, { nullable: true }) platform?: VisualPlatformGraph | null,
    @Arg('screenType', () => VisualScreenTypeGraph, { nullable: true }) screenType?: VisualScreenTypeGraph | null,
    @Arg('uiElements', () => [VisualUiElementGraph], { nullable: true })
    uiElements?: VisualUiElementGraph[] | null,
    @Arg('productSlug', () => String, { nullable: true }) productSlug?: string | null,
    @Arg('sort', () => VisualSortGraph, { nullable: true }) sort?: VisualSortGraph | null,
    @Arg('first', () => Int, { defaultValue: 24 }) first?: number,
    @Arg('after', () => String, { nullable: true }) after?: string | null,
    @Arg('page', () => Int, { nullable: true }) page?: number | null
  ): Promise<VisualScreenshotConnection> {
    let afterId: string | undefined;
    if (after !== undefined && after !== null && after !== '') {
      const decoded = Cursor.decode(after, ['id'] as const);
      if (!decoded.id || !ULID_PATTERN.test(decoded.id)) {
        throw new Error('pagination/invalid-cursor');
      }
      afterId = decoded.id;
    }

    const resolvedSort = sort ?? VisualSortGraph.LATEST;
    // POPULAR는 오프셋(page) 방식, LATEST는 기존 keyset 유지.
    if (resolvedSort === VisualSortGraph.POPULAR && afterId !== undefined) {
      throw new Error('pagination/invalid-connection-args');
    }
    if (resolvedSort === VisualSortGraph.LATEST && page !== undefined && page !== null) {
      throw new Error('pagination/invalid-connection-args');
    }

    const { screenshots, totalCount, hasNextPage } = await this.getVisualScreenshotsUseCase.execute({
      query: query ?? null,
      platform: platform ?? null,
      screenType: screenType ?? null,
      uiElements: uiElements ?? null,
      productSlug: productSlug ?? null,
      sort: resolvedSort,
      first: first ?? 24,
      afterId,
      page: page ?? undefined,
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
        hasPreviousPage: resolvedSort === VisualSortGraph.POPULAR ? (page ?? 1) > 1 : afterId !== undefined,
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

function decodeScreenshotFlowCursor(after: string, screenshotId: string): string {
  const invalidCursor = () => productInvalidArgs('이 화면의 관련 플로 커서가 올바르지 않습니다.');
  if (after.length > MAX_SCREENSHOT_FLOW_CURSOR_LENGTH) throw invalidCursor();
  let decoded: { screenshotId: string; flowId: string };
  try {
    decoded = Cursor.decode(after, ['screenshotId', 'flowId'] as const);
  } catch (error) {
    if (error instanceof Error && error.message === 'pagination/invalid-cursor') throw invalidCursor();
    throw error;
  }
  if (decoded.screenshotId !== screenshotId || !decoded.flowId || decoded.flowId.length > 26) throw invalidCursor();
  return decoded.flowId;
}
