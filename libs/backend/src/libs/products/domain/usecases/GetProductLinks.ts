import { Inject, Service } from 'typedi';
import { ProductLinkRepository, ProductLinkRepositoryToken } from '../repositories/ProductLinkRepository';

@Service()
export class GetProductLinks {
  constructor(@Inject(ProductLinkRepositoryToken) private readonly productLinkRepository: ProductLinkRepository) {}

  async execute({ productId }: { productId: string }) {
    return this.productLinkRepository.findManyByProductId(productId);
  }
}
