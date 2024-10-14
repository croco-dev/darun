import { Inject, Service } from 'typedi';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class RegisterProductCompany {
  constructor(@Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository) {}

  async execute({ companyId, productId }: { companyId: string; productId: string }) {
    await this.productRepository.updateById(productId, product => {
      product.registerCompany(companyId);

      return product;
    });
  }
}
