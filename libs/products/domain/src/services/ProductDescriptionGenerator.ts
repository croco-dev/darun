import { Token } from 'typedi';
import type { Product } from '../entities/Product';

export interface ProductDescriptionGenerator {
  generate(product: Product): Promise<string>;
}

export const ProductDescriptionGeneratorToken = new Token<ProductDescriptionGenerator>('ProductDescriptionGenerator');
