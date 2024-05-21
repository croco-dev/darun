import { ProductFeature, ProductFeatureRepository, ProductFeatureRepositoryToken } from '@products/domain';
import { Inject, Service } from 'typedi';
import { productFeatureCreateFailed } from '../errors/productFeatureError';

@Service()
export class CreateProductFeature {
  constructor(
    @Inject(ProductFeatureRepositoryToken) private readonly productFeatureRepository: ProductFeatureRepository
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
