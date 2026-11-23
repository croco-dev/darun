import { Inject, Service } from 'typedi';
import { ProductFeature } from '../entities/ProductFeature';
import { assertProductFeatureTextLengths } from '../errors/productFeatureError';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import { ProductFeatureRepositoryToken } from '../repositories/ProductFeatureRepository';

@Service()
export class UpdateProductFeature {
  constructor(
    @Inject(ProductFeatureRepositoryToken)
    private readonly productFeatureRepository: ProductFeatureRepository
  ) {}

  async execute({
    featureId,
    name,
    summary,
    emoji,
  }: {
    featureId: string;
    name?: string;
    summary?: string | null;
    emoji?: string;
  }): Promise<ProductFeature> {
    assertProductFeatureTextLengths(name, summary);
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
