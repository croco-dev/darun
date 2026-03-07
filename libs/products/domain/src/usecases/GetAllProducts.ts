import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class GetAllProducts {
  constructor(@Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository) {}

  async execute({
    limit,
    cursor,
    type = 'after',
  }: {
    limit: number;
    cursor?: {
      id: string;
    };
    type?: 'after' | 'before';
  }) {
    let products: Product[];
    if (type === 'after') {
      products = await this.productRepository.findAllByAfterIdAndLimit(limit, cursor?.id);
    } else {
      products = await this.productRepository.findAllByBeforeIdAndLimit(limit, cursor?.id);
    }
    const total = await this.productRepository.countAll();

    return {
      products,
      total,
    };
  }
}
