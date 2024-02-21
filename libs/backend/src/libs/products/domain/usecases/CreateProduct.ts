import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { productCreateFailed, productSlugAlreadyExists } from '../errors/productError';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class CreateProduct {
  constructor(@Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository) {}

  async execute({ name, slug, logoUrl, summary }: { name: string; slug: string; logoUrl: string; summary: string }) {
    const exists = await this.productRepository.findOneBySlug(slug);
    if (exists) {
      throw productSlugAlreadyExists();
    }

    const newProduct = new Product({ name, slug, logoUrl, summary });

    const inserted = await this.productRepository.insert(newProduct);

    if (!inserted) {
      throw productCreateFailed();
    }

    return this.productRepository.findOneBySlug(slug);
  }
}
