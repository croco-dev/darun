import { Token } from 'typedi';
import { ProductTag } from '../entities/ProductTag';

export interface ProductTagRepository {
  upsert(productTag: ProductTag): Promise<ProductTag>;
  findOneByProductId(productId: string): Promise<ProductTag | null>;
}

export const ProductTagRepositoryToken = new Token<ProductTagRepository>('ProductTagRepository');
