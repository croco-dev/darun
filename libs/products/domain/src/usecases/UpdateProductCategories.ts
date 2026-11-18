import { Inject, Service } from 'typedi';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class UpdateProductCategories {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

  execute(productId: string, categoryIds: string[]): Promise<string[]> {
    return this.productRepository.replaceCategoryIds(productId, [...new Set(categoryIds)]);
  }
}
