import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class PublishProduct {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

  async execute({ id, reviewToken }: { id: string; reviewToken?: string }): Promise<Product> {
    return reviewToken === undefined
      ? this.productRepository.publishById(id)
      : this.productRepository.publishById(id, reviewToken);
  }
}
