import { Inject, Service } from 'typedi';
import { ProductTagRepository, ProductTagRepositoryToken } from '../repositories/ProductTagRepository';

@Service()
export class GetProductTags {
  constructor(@Inject(ProductTagRepositoryToken) private readonly productTagRepository: ProductTagRepository) {}

  async execute({ productId }: { productId: string }) {
    return this.productTagRepository.findOneByProductId(productId);
  }
}
