import { Inject, Service } from 'typedi';
import { ProductFeatureScreenshotRepository } from '../repositories/ProductFeatureScreenshotRepository';
import { ProductFeatureScreenshotRepositoryToken } from '../repositories/ProductFeatureScreenshotRepository';

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
