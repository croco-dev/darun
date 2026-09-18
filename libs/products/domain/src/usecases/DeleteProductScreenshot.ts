import type { ImageDeleter } from '@darun/images-domain';
import { ImageDeleterToken } from '@darun/images-domain';
import { Inject, Service } from 'typedi';
import { productScreenshotNotFound } from '../errors/productError';
import { productScreenshotInUse } from '../errors/productFlowError';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';

@Service()
export class DeleteProductScreenshot {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository,
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository,
    @Inject(ImageDeleterToken)
    private readonly imageDeleter: ImageDeleter
  ) {}

  /**
   * 잠금 규약(접근 2): 대상 screenshot row를 FOR UPDATE로 잠근 뒤
   * 참조 확인 → 원격 이미지 삭제 → DB 삭제 순으로 진행한다. 잠금은 트랜잭션
   * 종료까지 유지되므로 동시 플로 저장이 삭제된 원격 이미지를 참조하지 않는다.
   * 외부 삭제 실패는 DB 행 보존과 실패 응답으로 이어진다.
   */
  async execute(id: string): Promise<void> {
    const screenshot = await this.productScreenshotRepository.findById(id);
    if (!screenshot) {
      throw productScreenshotNotFound();
    }

    const referencedFlowIds = await this.productFlowRepository.findFlowIdsByScreenshotId(id);
    if (referencedFlowIds.length > 0) {
      throw productScreenshotInUse();
    }

    await this.productScreenshotRepository.deleteWithLock(id, async lockedScreenshot => {
      const lockedFlowIds = await this.productFlowRepository.findFlowIdsByScreenshotId(id);
      if (lockedFlowIds.length > 0) {
        throw productScreenshotInUse();
      }
      await this.imageDeleter.delete(lockedScreenshot.imageUrl);
      return undefined;
    });
  }
}
