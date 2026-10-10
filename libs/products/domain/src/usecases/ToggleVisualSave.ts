import { Inject, Service } from 'typedi';
import { productNotFound } from '../errors/productError';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';
import { assertVisualUlid } from '../utils/assertVisualUlid';

export type ToggleVisualSaveResult = { saved: boolean };

/**
 * M3 화면 저장 토글. 로그인 필수(화면+플로 둘 다 저장 대상).
 * 존재하지 않는 화면이면 productNotFound.
 */
@Service()
export class ToggleVisualScreenshotSave {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({ id, userId }: { id: string; userId: string }): Promise<ToggleVisualSaveResult> {
    assertVisualUlid(id, '잘못된 화면 ID 형식입니다.');
    const screenshot = await this.productScreenshotRepository.findVisualPublishedById(id);
    if (!screenshot) {
      throw productNotFound();
    }
    return this.productScreenshotRepository.toggleVisualSave({ screenshotId: id, userId });
  }
}

/**
 * M3 플로 저장 토글. 로그인 필수.
 */
@Service()
export class ToggleVisualFlowSave {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({ id, userId }: { id: string; userId: string }): Promise<ToggleVisualSaveResult> {
    assertVisualUlid(id, '잘못된 플로 ID 형식입니다.');
    const flow = await this.productFlowRepository.findVisualPublishedById(id);
    if (!flow) {
      throw productNotFound();
    }
    return this.productFlowRepository.toggleVisualSave({ flowId: id, userId });
  }
}
