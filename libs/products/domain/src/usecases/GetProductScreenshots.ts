import { Inject, Service } from 'typedi';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';

@Service()
export class GetProductScreenshots {
  constructor(
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({ productId }: { productId: string }) {
    return this.productScreenshotRepository.findManyByProductIdSortByPriorityDesc(productId);
  }
}
