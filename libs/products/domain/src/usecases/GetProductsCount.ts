import { Inject, Service } from "typedi";
import type { ProductRepository } from "../repositories/ProductRepository";
import { ProductRepositoryToken } from "../repositories/ProductRepository";

@Service()
export class GetProductsCount {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute() {
    return this.productRepository.countPublishedAll();
  }
}
