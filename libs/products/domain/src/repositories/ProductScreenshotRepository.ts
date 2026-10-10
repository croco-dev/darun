import { Token } from 'typedi';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import type { VisualPlatform, VisualScreenType } from '../entities/VisualClassification';

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
};

export type VisualSort = 'LATEST' | 'POPULAR';

export interface ProductScreenshotRepository {
  findManyByProductIdSortByPriorityDesc(productId: string): Promise<ProductScreenshot[]>;
  findById(id: string): Promise<ProductScreenshot | null>;
  insert(productScreenshot: ProductScreenshot): Promise<ProductScreenshot>;
  deleteById(id: string): Promise<void>;
  updateById(
    id: string,
    modifier: (screenshot: ProductScreenshot) => ProductScreenshot,
    validateLocked?: (locked: ProductScreenshot) => Promise<void>
  ): Promise<ProductScreenshot>;
  /**
   * 잠금 규약(접근 2): screenshot row를 FOR UPDATE로 잠근 트랜잭션에서
   * validateLocked를 실행한 뒤, 통과하면 DB 행을 삭제한다.
   * validateLocked가 실패하면 트랜잭션은 rollback되고 행은 보존된다.
   */
  deleteWithLock(id: string, validateLocked: (locked: ProductScreenshot) => Promise<void>): Promise<void>;
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
}

export const ProductScreenshotRepositoryToken = new Token<ProductScreenshotRepository>('ProductScreenshotRepository');
