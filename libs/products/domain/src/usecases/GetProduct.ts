import { Inject, Service } from 'typedi';
import { productInvalidArgs } from '../errors/productError';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class GetProduct {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository
  ) {}

  async execute({ id, slug, fresh }: { id?: string; slug?: string; fresh?: boolean }) {
    if (slug) {
      return this.productRepository.findOneBySlug(slug);
    }

    if (!id) {
      throw productInvalidArgs('id or slug is required to get a product.');
    }
    return fresh ? this.productRepository.findOneFreshById(id) : this.productRepository.findOneById(id);
  }
}
