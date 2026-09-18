import { Inject, Service } from 'typedi';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import { ProductFeatureRepositoryToken } from '../repositories/ProductFeatureRepository';

@Service()
export class GetProductFeature {
  constructor(
    @Inject(ProductFeatureRepositoryToken)
    private readonly productFeatureRepository: ProductFeatureRepository
  ) {}

  async execute({ id }: { id: string }) {
    return this.productFeatureRepository.findOneById(id);
  }
}
