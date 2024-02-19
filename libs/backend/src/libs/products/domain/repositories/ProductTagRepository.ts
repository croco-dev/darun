import { Token } from 'typedi';
import { ProductTag } from '../entities/ProductTag';

export interface ProductTagRepository {
  findManyByProductId(productId: string): Promise<ProductTag[]>;
}

export const ProductTagRepositoryToken = new Token<ProductTagRepository>('ProductTagRepository');
