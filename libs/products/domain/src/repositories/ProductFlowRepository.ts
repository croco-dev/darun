import { Token } from 'typedi';
import type { ProductFlow } from '../entities/ProductFlow';
import type { ProductScreenshot } from '../entities/ProductScreenshot';

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
  findVisualPublishedById(id: string): Promise<VisualFlowDetail | null>;
  countVisualPublishedByFilter(filter: VisualFlowFilter): Promise<number>;
  findManyVisualPublishedByScreenshotId(screenshotId: string): Promise<VisualFlowSummary[]>;
}

export const ProductFlowRepositoryToken = new Token<ProductFlowRepository>('ProductFlowRepository');
