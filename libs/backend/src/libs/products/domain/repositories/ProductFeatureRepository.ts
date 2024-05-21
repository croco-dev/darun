import { Token } from 'typedi';
import { ProductFeature } from '../entities/ProductFeature';

export interface ProductFeatureRepository {
  findManyByProductId(productId: string): Promise<ProductFeature[]>;
  insert(newFeature: ProductFeature): Promise<ProductFeature>;
}

export const ProductFeatureRepositoryToken = new Token<ProductFeatureRepository>('ProductFeatureRepository');
