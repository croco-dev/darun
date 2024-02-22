import { Inject, Service } from 'typedi';
import { ProductFeatureRepository, ProductFeatureRepositoryToken } from '../repositories/ProductFeatureRepository';

@Service()
export class GetProductFeatures {
  constructor(
    @Inject(ProductFeatureRepositoryToken) private readonly productFeatureRepository: ProductFeatureRepository
  ) {}

  async execute({ productId }: { productId: string }) {
    return this.productFeatureRepository.findManyByProductId(productId);
  }
}
