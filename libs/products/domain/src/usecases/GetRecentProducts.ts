import { Inject, Service } from "typedi";
import type { ProductRepository } from "../repositories/ProductRepository";
import { ProductRepositoryToken } from "../repositories/ProductRepository";

@Service()
export class GetRecentProducts {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute({ limit }: { limit: number }) {
    return this.productRepository.findTopNSortByPublishedAtDesc(limit);
  }
}
