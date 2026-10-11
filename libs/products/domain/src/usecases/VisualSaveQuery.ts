import { Inject, Service } from 'typedi';
import type { ProductFlowRepository, VisualFlowSummary } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import type {
  ProductScreenshotRepository,
  VisualScreenshotWithProduct,
} from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';
import { assertVisualUlid } from '../utils/assertVisualUlid';

export type VisualSaveStatus = { saved: boolean };

/**
 * M3 저장 여부 조회. 로그인 필수.
 * 상세 페이지 진입 시 저장 버튼 초기 상태용.
 */
@Service()
export class GetVisualSaveStatus {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository,
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async screenshot({ id, userId }: { id: string; userId: string }): Promise<VisualSaveStatus> {
    assertVisualUlid(id, '잘못된 화면 ID 형식입니다.');
    const saved = await this.productScreenshotRepository.isVisualSaved({ screenshotId: id, userId });
    return { saved };
  }

  async flow({ id, userId }: { id: string; userId: string }): Promise<VisualSaveStatus> {
    assertVisualUlid(id, '잘못된 플로 ID 형식입니다.');
    const saved = await this.productFlowRepository.isVisualSaved({ flowId: id, userId });
    return { saved };
  }
}

export const VISUAL_SAVES_MAX_FIRST = 48;

export type VisualSavedItem = { id: string; savedAt: string };

/**
 * M3 내 저장 목록. 로그인 필수. kind별 화면/플로 ID 목록.
 * 정렬 디폴트 LATEST(저장 시각 내림차순) 유지.
 */
@Service()
export class GetMyVisualSaves {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({
    userId,
    kind,
    first,
    page,
  }: {
    userId: string;
    kind: 'screenshot' | 'flow';
    first: number;
    page: number;
  }): Promise<{ ids: string[]; totalCount: number }> {
    const limit = Math.min(Math.max(first, 1), VISUAL_SAVES_MAX_FIRST);
    const safePage = Math.max(page, 0);
    const offset = safePage * limit;
    const { screenshotIds, flowIds, totalCount } = await this.productScreenshotRepository.findVisualSavesByUser({
      userId,
      kind,
      limit,
      offset,
    });
    return { ids: kind === 'screenshot' ? screenshotIds : flowIds, totalCount };
  }
}

function resolveSavesPage({ first, page }: { first: number; page: number }): { limit: number; offset: number } {
  const limit = Math.min(Math.max(first, 1), VISUAL_SAVES_MAX_FIRST);
  const safePage = Math.max(page, 0);
  return { limit, offset: safePage * limit };
}

/**
 * M4 내 저장 화면 카드 목록. 로그인 필수.
 * 저장 시각 내림차순(LATEST) + id 내림차순 tiebreak, 공개 제품만.
 * first 상한(VISUAL_SAVES_MAX_FIRST)·page 하한(0) 정규화는 M3 ID 목록과 동일.
 */
@Service()
export class GetMyVisualSavedScreenshots {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({
    userId,
    first,
    page,
  }: {
    userId: string;
    first: number;
    page: number;
  }): Promise<{ screenshots: VisualScreenshotWithProduct[]; totalCount: number; hasNextPage: boolean }> {
    const { limit, offset } = resolveSavesPage({ first, page });
    const { screenshots, totalCount } = await this.productScreenshotRepository.findManyVisualSavedScreenshotsByUser({
      userId,
      limit: limit + 1,
      offset,
    });
    const hasNextPage = screenshots.length > limit;
    return { screenshots: hasNextPage ? screenshots.slice(0, limit) : screenshots, totalCount, hasNextPage };
  }
}

/**
 * M4 내 저장 플로 카드 목록. 로그인 필수.
 * 저장 시각 내림차순(LATEST) + id 내림차순 tiebreak, 공개 제품만.
 */
@Service()
export class GetMyVisualSavedFlows {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({
    userId,
    first,
    page,
  }: {
    userId: string;
    first: number;
    page: number;
  }): Promise<{ flows: VisualFlowSummary[]; totalCount: number; hasNextPage: boolean }> {
    const { limit, offset } = resolveSavesPage({ first, page });
    const { flows, totalCount } = await this.productFlowRepository.findManyVisualSavedFlowsByUser({
      userId,
      limit: limit + 1,
      offset,
    });
    const hasNextPage = flows.length > limit;
    return { flows: hasNextPage ? flows.slice(0, limit) : flows, totalCount, hasNextPage };
  }
}
