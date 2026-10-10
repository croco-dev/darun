import { Token } from 'typedi';
import type { ProductFlow } from '../entities/ProductFlow';
import type { ProductScreenshot } from '../entities/ProductScreenshot';
import type { VisualSort } from './ProductScreenshotRepository';

export type VisualFlowFilter = {
  query: string;
  platform?: string;
  flowType?: string;
  productSlug?: string;
};

export type VisualFlowSummary = {
  id: string;
  title: string;
  description: string;
  platform: string;
  flowType: string;
  stepCount: number;
  coverScreenshot: { id: string; imageUrl: string; imageAlt: string };
  productId: string;
  productName: string;
  productSlug: string;
};

export type VisualFlowDetailStep = {
  position: number;
  caption: string;
  screenshot: { id: string; imageUrl: string; imageAlt: string; title: string | null };
};

export type VisualFlowDetail = {
  id: string;
  productId: string;
  title: string;
  description: string;
  platform: string;
  flowType: string;
  steps: VisualFlowDetailStep[];
  productName: string;
  productSlug: string;
};

export interface ProductFlowRepository {
  /**
   * 플로와 단계 전체를 한 트랜잭션으로 저장한다.
   * 단계에 쓰인 screenshot rows를 ID 오름차순으로 FOR UPDATE 잠근 뒤
   * validateSteps로 단계 무결성(소속·플랫폼·중복·존재)을 검증한다.
   * 검증이나 저장이 실패하면 트랜잭션은 rollback되고 기존 상태가 보존된다.
   */
  insert(flow: ProductFlow, validateSteps: (lockedScreenshots: ProductScreenshot[]) => void): Promise<ProductFlow>;
  /**
   * flow row를 잠근 뒤 단계 screenshot rows를 ID 오름차순으로 잠그고,
   * 검증 통과 시 본문과 단계 전체를 교체한다.
   */
  updateById(
    id: string,
    modifier: (flow: ProductFlow) => ProductFlow,
    validateSteps: (lockedScreenshots: ProductScreenshot[], lockedFlow: ProductFlow) => void
  ): Promise<ProductFlow>;
  deleteById(id: string): Promise<void>;
  findById(id: string): Promise<ProductFlow | null>;
  findAdminFlowDetailById(id: string): Promise<VisualFlowDetail | null>;
  findManyByProductId(productId: string): Promise<ProductFlow[]>;
  findFlowIdsByScreenshotId(screenshotId: string): Promise<string[]>;
  findManyVisualPublishedByFilterAndAfterIdAndLimit(
    filter: VisualFlowFilter,
    limit: number,
    afterId?: string
  ): Promise<VisualFlowSummary[]>;
  /**
   * M1 인기순 오프셋 조회. 배치 테이블 없이 집계 테이블
   * (visual_view_events/visual_saves) 서브쿼리로 실시간 SQL ORDER BY 계산한다.
   * 느려지면 배치 도입을 검토한다.
   */
  findManyVisualPublishedByFilterAndPageAndLimit(
    filter: VisualFlowFilter,
    page: number,
    limit: number
  ): Promise<VisualFlowSummary[]>;
  findVisualPublishedById(id: string): Promise<VisualFlowDetail | null>;
  countVisualPublishedByFilter(filter: VisualFlowFilter): Promise<number>;
  findManyVisualPublishedByScreenshotId(screenshotId: string): Promise<VisualFlowSummary[]>;
  /**
   * M2 조회 기록. 같은 viewerHash+target의 24시간 내 중복은 무시한다.
   * true면 신규 기록, false면 중복 무시(24시간 내 기존 기록 존재).
   */
  insertVisualViewEvent(params: { flowId: string; viewerHash: string }): Promise<boolean>;
  /**
   * M3 저장 토글. 로그인 필수.
   * 이미 저장했으면 삭제하고 saved:false, 아니면 생성하고 saved:true.
   */
  toggleVisualSave(params: { flowId: string; userId: string }): Promise<{ saved: boolean }>;
  /** M3 저장 여부 조회. 로그인 필수. */
  isVisualSaved(params: { flowId: string; userId: string }): Promise<boolean>;
  /**
   * M4 내 저장 플로 카드 목록. 로그인 필수.
   * 저장 시각 내림차순(LATEST) + id 내림차순 tiebreak, 공개 제품만.
   */
  findManyVisualSavedFlowsByUser(params: {
    userId: string;
    limit: number;
    offset: number;
  }): Promise<{ flows: VisualFlowSummary[]; totalCount: number }>;
}

export const ProductFlowRepositoryToken = new Token<ProductFlowRepository>('ProductFlowRepository');
