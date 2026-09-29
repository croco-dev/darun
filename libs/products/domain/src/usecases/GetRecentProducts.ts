import { Inject, Service } from 'typedi';
import { productInvalidArgs } from '../errors/productError';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

export const MAX_RECENT_PRODUCTS_LIMIT = 100;

@Service()
export class GetRecentProducts {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

  async execute({ limit }: { limit: number }) {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RECENT_PRODUCTS_LIMIT) {
      throw productInvalidArgs('limit must be an integer between 1 and 100.');
    }
    return this.productRepository.findTopNSortByPublishedAtDesc(limit);
  }
}
