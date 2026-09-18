import { Token } from 'typedi';
import { Product } from '../entities/Product';

export type ProductDescriptionGenerationContext = {
  categoryLabels?: string[];
};

export interface ProductDescriptionGenerator {
  generate(product: Product, context?: ProductDescriptionGenerationContext): Promise<string>;
}

export const ProductDescriptionGeneratorToken = new Token<ProductDescriptionGenerator>('ProductDescriptionGenerator');
