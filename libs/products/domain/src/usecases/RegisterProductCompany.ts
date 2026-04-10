import { Inject, Service } from "typedi";
import type { ProductRepository } from "../repositories/ProductRepository";
import { ProductRepositoryToken } from "../repositories/ProductRepository";

@Service()
export class RegisterProductCompany {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute({
    companyId,
    productId,
  }: {
    companyId: string;
    productId: string;
  }) {
    await this.productRepository.updateById(productId, (product) => {
      product.registerCompany(companyId);

      return product;
    });
  }
}
