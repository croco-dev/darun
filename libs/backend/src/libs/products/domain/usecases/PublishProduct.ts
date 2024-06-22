import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class PublishProduct {
  constructor(@Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository) {}

  async execute({ id }: { id: string }): Promise<Product> {
    return this.productRepository.updateById(id, product => {
      product.publish();
      return product;
    });
  }
}
