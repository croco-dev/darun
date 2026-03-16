import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

import { ProductDescriptionGenerator } from '../services/ProductDescriptionGenerator';
import { ProductDescriptionGeneratorToken } from '../services/ProductDescriptionGenerator';

@Service()
export class GenerateProductDescription {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    @Inject(ProductDescriptionGeneratorToken)
    private readonly productDescriptionGenerator: ProductDescriptionGenerator
  ) {}

  async execute({ productId }: { productId: string }): Promise<Product> {
    const product = await this.productRepository.findOneById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const generatedDescription = await this.productDescriptionGenerator.generate(product);

    return this.productRepository.updateById(product.id, prevProduct => {
      prevProduct.update({ description: generatedDescription });
      return prevProduct;
    });
  }
}
