import { Token } from 'typedi';
import { ProductLink } from '../entities/ProductLink';

export interface ProductLinkRepository {
  insert(input: ProductLink): Promise<ProductLink>;
  findManyByProductId(productId: string): Promise<ProductLink[]>;
}

export const ProductLinkRepositoryToken = new Token<ProductLinkRepository>('ProductLinkRepository');
