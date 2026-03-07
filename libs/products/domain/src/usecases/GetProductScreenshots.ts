import { Inject, Service } from 'typedi';
import {
  ProductScreenshotRepository,
  ProductScreenshotRepositoryToken,
} from '../repositories/ProductScreenshotRepository';

@Service()
export class GetProductScreenshots {
  constructor(
    @Inject(ProductScreenshotRepositoryToken) private readonly productScreenshotRepository: ProductScreenshotRepository
  ) {}

  async execute({ productId }: { productId: string }) {
    return this.productScreenshotRepository.findManyByProductIdSortByPriorityDesc(productId);
  }
}
