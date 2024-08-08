import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class EditProduct {
  constructor(@Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository) {}

  async execute({
    id,
    name,
    summary,
    description,
    logoUrl,
  }: {
    id: string;
    name?: string;
    summary?: string;
    description?: string;
    logoUrl?: string;
  }): Promise<Product> {
    return this.productRepository.updateById(id, product => {
      product.update({
        name,
        summary,
        description,
        logoUrl,
      });

      return product;
    });
  }
}
