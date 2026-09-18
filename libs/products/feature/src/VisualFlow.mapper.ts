import type { Product, ProductFlow, ProductScreenshot } from '@darun/products-domain';
import type { VisualFlowDetail } from '@darun/products-domain';
import type { VisualFlow } from './graphs/VisualFlow';

/**
 * 공개 상세 조회 결과를 GraphQL VisualFlow로 매핑한다.
 */
export function toGraphFlowDetail(flow: VisualFlowDetail | null, fallbackId: string): VisualFlow {
  if (!flow) {
    throw new Error('product-flow/not-found');
  }
  return {
    id: flow.id || fallbackId,
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
    coverScreenshot: toGraphScreenshot(flow.steps[0]?.screenshot),
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

function toGraphScreenshot(
  screenshot: { id: string; imageUrl: string; imageAlt: string; title: string | null } | undefined
) {
  if (!screenshot) {
    throw new Error('product-flow/invalid-args');
  }
  return {
    id: screenshot.id,
    imageUrl: screenshot.imageUrl,
    imageAlt: screenshot.imageAlt,
    title: screenshot.title,
  };
}

/**
 * mutation 응답용 매핑: 저장된 ProductFlow 본문과 제품·단계 화면 정보로
 * VisualFlow 그래프를 구성한다. 제품 공개 여부와 무관하게 관리자 편집
 * 결과를 반환한다 (admin 조회와 같은 규칙).
 */
export function toGraphFlowFromSaved(
  flow: ProductFlow,
  product: Product,
  screenshots: ProductScreenshot[]
): VisualFlow {
  const screenshotById = new Map(screenshots.map(screenshot => [screenshot.id, screenshot]));
  const steps = flow.steps.map((step, index) => {
    const screenshot = screenshotById.get(step.screenshotId);
    if (!screenshot) {
      throw new Error('product-flow/invalid-args');
    }
    return {
      position: index,
      caption: step.caption,
      screenshot: {
        id: screenshot.id,
        imageUrl: screenshot.imageUrl,
        imageAlt: screenshot.imageAlt,
        title: screenshot.title ?? null,
      },
    };
  });

  return {
    id: flow.id,
    title: flow.title,
    description: flow.description,
    platform: flow.platform,
    flowType: flow.flowType,
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      logoUrl: product.logoUrl,
      summary: product.summary,
    },
    coverScreenshot: steps[0].screenshot,
    stepCount: steps.length,
    steps,
  };
}
