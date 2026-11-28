import { Inject, Service } from 'typedi';
import { productInvalidArgs } from '../errors/productError';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';

@Service()
export class ReorderProductScreenshots {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly screenshots: ProductScreenshotRepository
  ) {}

  async execute(
    productId: string,
    orderedIds: readonly string[],
    expectedOrderIds: readonly string[],
    expectedCoverId: string | null
  ): Promise<void> {
    const expectedIds = new Set(expectedOrderIds);
    if (
      expectedIds.size !== expectedOrderIds.length ||
      new Set(orderedIds).size !== expectedIds.size ||
      orderedIds.length !== expectedIds.size ||
      !orderedIds.every(id => expectedIds.has(id))
    ) {
      throw productInvalidArgs('이 상품의 스크린샷을 빠짐없이 한 번씩 지정해 주세요.');
    }
    if (expectedCoverId === null ? expectedIds.size > 0 : !expectedIds.has(expectedCoverId)) {
      throw productInvalidArgs('편집을 시작할 때의 대표 화면을 지정해 주세요.');
    }
    await this.screenshots.reorder(productId, orderedIds, expectedOrderIds, expectedCoverId);
  }
}
