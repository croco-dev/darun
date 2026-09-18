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
  findVisualPublishedById(id: string): Promise<VisualScreenshotWithProduct | null>;
  countVisualPublishedByFilter(filter: VisualScreenshotFilter): Promise<number>;
}

export const ProductScreenshotRepositoryToken = new Token<ProductScreenshotRepository>('ProductScreenshotRepository');
