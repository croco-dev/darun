import { Inject, Service } from "typedi";
import type { ProductRepository } from "../repositories/ProductRepository";
import { ProductRepositoryToken } from "../repositories/ProductRepository";
import { productInvalidArgs } from "../errors/productError";

@Service()
export class GetProduct {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute({ id, slug }: { id?: string; slug?: string }) {
    if (slug) {
      return this.productRepository.findOneBySlug(slug);
    }

    if (!id) {
      throw productInvalidArgs("id or slug is required to get a product.");
    }
    return this.productRepository.findOneById(id);
  }
}
