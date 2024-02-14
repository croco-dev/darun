import { Inject, Service } from 'typedi';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class GetProduct {
  constructor(@Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository) {}

  async execute({ id }: { id: string }) {
    return this.productRepository.findOneById(id);
  }
}
