import { Inject, Service } from 'typedi';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class GetRecentProducts {
  constructor(@Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository) {}

  async execute({ limit }: { limit: number }) {
    return this.productRepository.findTopNSortByPublishedAtDesc(limit);
  }
}
