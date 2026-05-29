import { Inject, Service } from "typedi";
import { Product } from "../entities/Product";
import type { ProductRepository } from "../repositories/ProductRepository";
import { ProductRepositoryToken } from "../repositories/ProductRepository";
import type { ProductDescriptionGenerator } from "../services/ProductDescriptionGenerator";
import { ProductDescriptionGeneratorToken } from "../services/ProductDescriptionGenerator";
import { productNotFound } from "../errors/productError";

@Service()
export class GenerateProductDescription {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    @Inject(ProductDescriptionGeneratorToken)
    private readonly productDescriptionGenerator: ProductDescriptionGenerator,
  ) {}

  async execute({ productId }: { productId: string }): Promise<Product> {
    const product = await this.productRepository.findOneById(productId);
    if (!product) {
      throw productNotFound();
    }

    const generatedDescription =
      await this.productDescriptionGenerator.generate(product);

    return this.productRepository.updateById(product.id, (prevProduct) => {
      prevProduct.update({ description: generatedDescription });
      return prevProduct;
    });
  }
}
