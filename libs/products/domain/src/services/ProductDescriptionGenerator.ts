import { Token } from 'typedi';
import { Product } from '../entities/Product';

export interface ProductDescriptionGenerator {
  generate(product: Product): Promise<string>;
}

export const ProductDescriptionGeneratorToken = new Token<ProductDescriptionGenerator>('ProductDescriptionGenerator');
