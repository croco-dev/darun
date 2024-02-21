import { Inject, Service } from 'typedi';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class GetProduct {
  constructor(@Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository) {}

  async execute({ id, slug }: { id?: string; slug?: string }) {
    if (slug) {
      return this.productRepository.findPublishedOneBySlug(slug);
    }

    if (!id) {
      throw new Error('id or slug is required to get a product.');
    }
    return this.productRepository.findPublishedOneById(id);
  }
}
