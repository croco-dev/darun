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
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  /** Public deletion completes with the DB commit; media cleanup is durable and asynchronous. */
  async execute(id: string): Promise<void> {
    const screenshot = await this.productScreenshotRepository.findById(id);
    if (!screenshot) {
      throw productScreenshotNotFound();
    }

    const referencedFlowIds = await this.productFlowRepository.findFlowIdsByScreenshotId(id);
    if (referencedFlowIds.length > 0) {
      throw productScreenshotInUse();
    }

    await this.productScreenshotRepository.deleteWithLock(id, async (_locked, findReferencingFlowIds) => {
      const lockedFlowIds = await findReferencingFlowIds();
      if (lockedFlowIds.length > 0) {
        throw productScreenshotInUse();
      }
    });
  }
}
