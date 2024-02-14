import { Token } from 'typedi';
import { ProductLink } from '../entities/ProductLink';

export interface ProductLinkRepository {
  findManyByProductId(productId: string): Promise<ProductLink[]>;
}

export const ProductLinkRepositoryToken = new Token<ProductLinkRepository>('ProductLinkRepository');
