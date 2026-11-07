import { Inject, Service } from 'typedi';
import { productNotFound } from '../errors/productError';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';
import { assertVisualUlid } from '../utils/assertVisualUlid';

export type SetVisualSaveResult = { saved: boolean };

/**
 * M3 화면 저장 상태 설정. 로그인 필수(화면+플로 둘 다 저장 대상).
 * 존재하지 않는 화면이면 productNotFound.
 */
@Service()
export class SetVisualScreenshotSave {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({ id, userId, saved }: { id: string; userId: string; saved: boolean }): Promise<SetVisualSaveResult> {
    assertVisualUlid(id, '잘못된 화면 ID 형식입니다.');
    const screenshot = await this.productScreenshotRepository.findVisualPublishedById(id);
    if (!screenshot) {
      throw productNotFound();
    }
    return this.productScreenshotRepository.setVisualSave({
      screenshotId: id,
      userId,
      saved,
    });
  }
}

/**
 * M3 플로 저장 상태 설정. 로그인 필수.
 */
@Service()
export class SetVisualFlowSave {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({ id, userId, saved }: { id: string; userId: string; saved: boolean }): Promise<SetVisualSaveResult> {
    assertVisualUlid(id, '잘못된 플로 ID 형식입니다.');
    const flow = await this.productFlowRepository.findVisualPublishedById(id);
    if (!flow) {
      throw productNotFound();
    }
    return this.productFlowRepository.setVisualSave({
      flowId: id,
      userId,
      saved,
    });
  }
}
