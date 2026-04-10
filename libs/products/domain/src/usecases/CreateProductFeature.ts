import { Inject, Service } from 'typedi';
import { ProductFeature } from '../entities/ProductFeature';
import { productFeatureCreateFailed } from '../errors/productFeatureError';
import { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import { ProductFeatureRepositoryToken } from '../repositories/ProductFeatureRepository';

@Service()
export class CreateProductFeature {
  constructor(
    @Inject(ProductFeatureRepositoryToken)
    private readonly productFeatureRepository: ProductFeatureRepository
  ) {}

  async execute({
    name,
    summary,
    emoji,
    productId,
  }: {
    name: string;
    summary: string;
    emoji: string;
    productId: string;
  }): Promise<ProductFeature> {
    const newFeature = new ProductFeature({ name, summary, emoji, productId });

    const insertedFeature = await this.productFeatureRepository.insert(newFeature);

    if (!insertedFeature) {
      throw productFeatureCreateFailed();
    }

    return insertedFeature;
  }
}
