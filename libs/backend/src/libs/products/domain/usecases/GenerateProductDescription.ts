import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import { ProductRepository, ProductRepositoryToken } from '../repositories/ProductRepository';
import { ProductDescriptionGenerator, ProductDescriptionGeneratorToken } from '../services/ProductDescriptionGenerator';

@Service()
export class GenerateProductDescription {
  constructor(
    @Inject(ProductRepositoryToken) private readonly productRepository: ProductRepository,
    @Inject(ProductDescriptionGeneratorToken) private readonly productDescriptionGenerator: ProductDescriptionGenerator
  ) {}

  async execute({ productId }: { productId: string }): Promise<Product> {
    const product = await this.productRepository.findOneById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const generatedDescription = await this.productDescriptionGenerator.generate(product);

    product.update({ description: generatedDescription });

    const updatedProduct = await this.productRepository.updateById(product.id, () => product);
    if (!updatedProduct) {
      throw new Error('Failed to update product description');
    }

    return updatedProduct;
  }
}
