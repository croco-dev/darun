import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class GetPublishedProductsForSitemap {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

  async execute({
    limit = 100,
    cursor,
  }: {
    limit?: number;
    cursor?: string;
  } = {}): Promise<{ products: Product[]; nextCursor?: string }> {
    const products = await this.productRepository.findPublishedByAfterIdAndLimit(limit, cursor);
    const nextCursor = products.length === limit ? products[products.length - 1]?.id : undefined;

    return {
      products,
      nextCursor,
    };
  }
}
