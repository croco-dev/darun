import { Token } from 'typedi';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import type { VisualPlatform, VisualScreenType } from '../entities/VisualClassification';
import type { VisualUiElement } from '../entities/VisualUiElement';

export type VisualScreenshotWithProduct = ProductScreenshot & {
  productName: string;
  productSlug: string;
  productSummary: string;
  productLogoUrl: string;
};

export type VisualScreenshotFilter = {
  query: string;
  platform?: VisualPlatform;
  screenType?: VisualScreenType;
  productSlug?: string;
  uiElements?: readonly VisualUiElement[];
};

export type VisualSort = 'LATEST' | 'POPULAR';

export interface ProductScreenshotRepository {
  findManyByProductIdSortByPriorityDesc(productId: string): Promise<ProductScreenshot[]>;
  findById(id: string): Promise<ProductScreenshot | null>;
  insert(productScreenshot: ProductScreenshot): Promise<ProductScreenshot>;
  deleteById(id: string): Promise<void>;
  /** Locked validation reads references through the supplied transaction-scoped reader. */
  updateById(
    id: string,
    modifier: (screenshot: ProductScreenshot) => ProductScreenshot,
    validateLocked?: (locked: ProductScreenshot, findReferencingFlowIds: () => Promise<string[]>) => Promise<void>,
    /** Same transaction as metadata; undefined preserves tags, null/[] clears them. */
    uiElements?: readonly string[] | null
  ): Promise<ProductScreenshot>;
  /** Reference validation, row deletion, content checkpoint and media cleanup intent commit together.
   * Remote cleanup runs after commit in a recoverable worker, outside Product/screenshot locks.
   */
  deleteWithLock(
    id: string,
    validateLocked: (locked: ProductScreenshot, findReferencingFlowIds: () => Promise<string[]>) => Promise<void>
  ): Promise<void>;
  findManyVisualPublishedByFilterAndAfterIdAndLimit(
    filter: VisualScreenshotFilter,
    limit: number,
    afterId?: string
  ): Promise<VisualScreenshotWithProduct[]>;
  /**
   * M1 인기순 오프셋 조회. 배치 테이블 없이 집계 테이블
   * (visual_view_events/visual_saves) 서브쿼리로 실시간 SQL ORDER BY 계산한다.
   * 느려지면 배치 도입을 검토한다.
   */
  findManyVisualPublishedByFilterAndPageAndLimit(
    filter: VisualScreenshotFilter,
    page: number,
    limit: number
  ): Promise<VisualScreenshotWithProduct[]>;
  findVisualPublishedById(id: string): Promise<VisualScreenshotWithProduct | null>;
  countVisualPublishedByFilter(filter: VisualScreenshotFilter): Promise<number>;
  /**
   * M2 조회 기록. 같은 viewerHash+target의 24시간 내 중복은 무시한다.
   * true면 신규 기록, false면 중복 무시(24시간 내 기존 기록 존재).
   */
  insertVisualViewEvent(params: { screenshotId?: string; flowId?: string; viewerHash: string }): Promise<boolean>;
  /**
   * M3 저장 토글. 로그인 필수.
   * 이미 저장했으면 삭제하고 saved:false, 아니면 생성하고 saved:true.
   */
  toggleVisualSave(params: { screenshotId?: string; flowId?: string; userId: string }): Promise<{ saved: boolean }>;
  /** M3 저장 여부 조회. 로그인 필수. */
  isVisualSaved(params: { screenshotId?: string; flowId?: string; userId: string }): Promise<boolean>;
  /** M3 내 저장 목록. 로그인 필수. 화면·플로 중 하나 지정. */
  findVisualSavesByUser(params: {
    userId: string;
    kind: 'screenshot' | 'flow';
    limit: number;
    offset: number;
  }): Promise<{ screenshotIds: string[]; flowIds: string[]; totalCount: number }>;
  /**
   * M4 내 저장 화면 카드 목록. 로그인 필수.
   * 저장 시각 내림차순(LATEST) + id 내림차순 tiebreak, 공개 제품만.
   */
  findManyVisualSavedScreenshotsByUser(params: {
    userId: string;
    limit: number;
    offset: number;
  }): Promise<{ screenshots: VisualScreenshotWithProduct[]; totalCount: number }>;
  /**
   * 스크린샷 UI 요소 태그 전체 교체 저장.
   * 닫힌 집합 밖 값은 거절한다. 반환값은 정규화된 현재 태그다.
   */
  replaceScreenshotUiElements(
    screenshotId: string,
    elements: readonly string[] | null | undefined
  ): Promise<VisualUiElement[]>;
  /**
   * 스크린샷별 UI 요소 태그 일괄 조회. 요청 id마다 목록을 묶어 반환한다.
   */
  findScreenshotUiElementsByScreenshotIds(screenshotIds: readonly string[]): Promise<Record<string, VisualUiElement[]>>;
}

export const ProductScreenshotRepositoryToken = new Token<ProductScreenshotRepository>('ProductScreenshotRepository');
