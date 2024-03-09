import { Inject, Service } from 'typedi';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class GetAllProducts {
  constructor(@Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository) {}

  async execute({
    limit,
    cursor,
  }: {
    limit: number;
    cursor?: {
      id: string;
    };
  }) {
    const products = await this.productRepository.findAllByGtIdAndLimit(limit, cursor?.id);
    const total = await this.productRepository.countAll();

    return {
      products,
      total,
    };
  }
}
