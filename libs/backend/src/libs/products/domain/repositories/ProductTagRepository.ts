import { Token } from 'typedi';
import { ProductTag } from '../entities/ProductTag';

export interface ProductTagRepository {
  findManyByProductId(productId: string): Promise<ProductTag[]>;
  updateTagsToProduct(productId: string, tags: ProductTag[]): Promise<void>;
}

export const ProductTagRepositoryToken = new Token<ProductTagRepository>('ProductTagRepository');
