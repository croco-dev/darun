import { Inject, Service } from 'typedi';
import {
  ProductFeatureScreenshotRepository,
  ProductFeatureScreenshotRepositoryToken,
} from '../repositories/ProductFeatureScreenshotRepository';

@Service()
export class GetProductFeatureScreenshots {
  constructor(
    @Inject(ProductFeatureScreenshotRepositoryToken)
    private readonly productFeatureScreenshotRepository: ProductFeatureScreenshotRepository
  ) {}

  async execute({ featureId }: { featureId: string }) {
    return this.productFeatureScreenshotRepository.findManyByFeatureIdSortByPriorityDesc(featureId);
  }
}
