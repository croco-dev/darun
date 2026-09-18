import { Inject, Service } from 'typedi';
import { ProductFlow } from '../entities/ProductFlow';
import type { ProductScreenshot } from '../entities/ProductScreenshot';
import { productFlowInvalidArgs } from '../errors/productFlowError';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import {
  FLOW_MAX_STEPS,
  FLOW_MIN_STEPS,
  normalizeFlowCaption,
  normalizeFlowDescription,
  normalizeFlowPlatform,
  normalizeFlowTitle,
  normalizeFlowType,
} from './ProductFlowMetadata';

export type ProductFlowStepInput = {
  screenshotId: string;
  caption: string;
};

export type ProductFlowDraft = {
  title: string;
  description: string;
  platform: string;
  flowType: string;
  steps: Array<{ screenshotId: string; caption: string }>;
};

/**
 * 플로 본문과 단계를 정규화한다. 단계 수 2~50, 중복 화면 금지,
 * 제목/설명/caption 길이, platform·flowType enum을 DB 작업 전에 검증한다.
 */
export function buildFlowDraft({
  title,
  description,
  platform,
  flowType,
  steps,
}: Omit<ProductFlowDraft, never> & { steps: ProductFlowStepInput[] }): ProductFlowDraft {
  if (steps.length < FLOW_MIN_STEPS || steps.length > FLOW_MAX_STEPS) {
    throw productFlowInvalidArgs('플로 단계는 2개 이상 50개 이하로 구성해 주세요.');
  }
  if (new Set(steps.map(step => step.screenshotId)).size !== steps.length) {
    throw productFlowInvalidArgs('같은 화면을 플로에 여러 번 사용할 수 없습니다.');
  }

  return {
    title: normalizeFlowTitle(title),
    description: normalizeFlowDescription(description),
    platform: normalizeFlowPlatform(platform),
    flowType: normalizeFlowType(flowType),
    steps: steps.map(step => ({
      screenshotId: step.screenshotId,
      caption: normalizeFlowCaption(step.caption),
    })),
  };
}

/**
 * 잠긴 screenshot rows에 대해 단계 무결성을 검증한다.
 * 같은 제품 소속, 플로 platform과 일치하는 분류 platform이어야 한다.
 * Repository 트랜잭션 안에서 호출된다.
 */
export function validateFlowSteps(
  lockedScreenshots: ProductScreenshot[],
  steps: Array<{ screenshotId: string }>,
  { productId, platform }: { productId: string; platform: string }
): void {
  const lockedById = new Map(lockedScreenshots.map(screenshot => [screenshot.id, screenshot]));

  for (const step of steps) {
    const screenshot = lockedById.get(step.screenshotId);
    if (!screenshot) {
      throw productFlowInvalidArgs('존재하지 않는 화면이 플로에 포함되어 있습니다.');
    }
    if (screenshot.productId !== productId) {
      throw productFlowInvalidArgs('같은 제품의 화면만 플로에 사용할 수 있습니다.');
    }
    if (screenshot.platform !== platform) {
      throw productFlowInvalidArgs('플로 플랫폼과 일치하는 분류가 있는 화면만 사용할 수 있습니다.');
    }
  }
}

@Service()
export class CreateProductFlow {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({
    productId,
    title,
    description,
    platform,
    flowType,
    steps,
  }: {
    productId: string;
    title: string;
    description: string;
    platform: string;
    flowType: string;
    steps: ProductFlowStepInput[];
  }): Promise<ProductFlow> {
    const draft = buildFlowDraft({ title, description, platform, flowType, steps });

    return this.productFlowRepository.insert(
      new ProductFlow({
        productId,
        title: draft.title,
        description: draft.description,
        platform: draft.platform,
        flowType: draft.flowType,
        steps: draft.steps,
      }),
      lockedScreenshots => validateFlowSteps(lockedScreenshots, draft.steps, { productId, platform: draft.platform })
    );
  }
}
