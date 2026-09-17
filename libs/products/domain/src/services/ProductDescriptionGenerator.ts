import { Token } from 'typedi';
import { Product } from '../entities/Product';

export type ProductDescriptionGenerationContext = {
  categoryLabels?: string[];
  features?: Array<{ name: string; summary?: string }>;
  links?: Array<{ title: string; link: string }>;
  searchResults?: Array<{
    title: string;
    url: string;
    description: string;
    extraSnippets?: string[];
  }>;
};

export interface ProductDescriptionGenerator {
  generate(product: Product, context?: ProductDescriptionGenerationContext): Promise<string>;
}

export const ProductDescriptionGeneratorToken = new Token<ProductDescriptionGenerator>('ProductDescriptionGenerator');
