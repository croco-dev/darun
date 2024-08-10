import { Token } from 'typedi';
import { ProductFeature } from '../entities/ProductFeature';

export interface ProductFeatureRepository {
  updateById(featureId: string, modifier: (feature: ProductFeature) => ProductFeature): Promise<ProductFeature>;
  findOneById(id: string): Promise<ProductFeature | null>;
  findManyByProductId(productId: string): Promise<ProductFeature[]>;
  insert(newFeature: ProductFeature): Promise<ProductFeature>;
}

export const ProductFeatureRepositoryToken = new Token<ProductFeatureRepository>('ProductFeatureRepository');
