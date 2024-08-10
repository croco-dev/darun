import { ProductFeature, ProductFeatureRepository, ProductFeatureRepositoryToken } from '@products/domain';
import { Inject, Service } from 'typedi';

@Service()
export class UpdateProductFeature {
  constructor(
    @Inject(ProductFeatureRepositoryToken) private readonly productFeatureRepository: ProductFeatureRepository
  ) {}

  async execute({
    featureId,
    name,
    summary,
    emoji,
  }: {
    featureId: string;
    name?: string;
    summary?: string;
    emoji?: string;
  }): Promise<ProductFeature> {
    return this.productFeatureRepository.updateById(featureId, feature => {
      feature.update({
        name,
        summary,
        emoji,
      });

      return feature;
    });
  }
}
