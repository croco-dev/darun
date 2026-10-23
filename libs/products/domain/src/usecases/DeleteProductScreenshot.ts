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
   * 잠금 안 참조 검사와 원격 삭제를 분리한다. Repository는 Product-first·
   * screenshot 잠금을 유지한 채 DB 삭제와 content checkpoint를 마친 후에만
   * 원격 삭제를 호출하며, 원격 삭제 실패도 DB 변경을 rollback한다.
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

    await this.productScreenshotRepository.deleteWithLock(
      id,
      async () => {
        const lockedFlowIds = await this.productFlowRepository.findFlowIdsByScreenshotId(id);
        if (lockedFlowIds.length > 0) {
          throw productScreenshotInUse();
        }
      },
      lockedScreenshot => this.imageDeleter.delete(lockedScreenshot.imageUrl)
    );
  }
}
