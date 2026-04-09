import { Token } from 'typedi';
import type { ProductLink } from '../entities/ProductLink';

export interface ProductLinkRepository {
  insert(input: ProductLink): Promise<ProductLink>;
  findManyByProductId(productId: string): Promise<ProductLink[]>;
  updateById(linkId: string, modifier: (link: ProductLink) => ProductLink): Promise<ProductLink>;
}

export const ProductLinkRepositoryToken = new Token<ProductLinkRepository>('ProductLinkRepository');
