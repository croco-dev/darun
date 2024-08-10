import { ProductFeatureRepository, ProductFeatureRepositoryToken } from '@products/domain';
import { Inject, Service } from 'typedi';

@Service()
export class GetProductFeature {
  constructor(
    @Inject(ProductFeatureRepositoryToken) private readonly productFeatureRepository: ProductFeatureRepository
  ) {}

  async execute({ id }: { id: string }) {
    return this.productFeatureRepository.findOneById(id);
  }
}
