import { Token } from 'typedi';
import { ProductFeatureScreenshot } from '../entities/ProductFeatureScreenshot';

export interface ProductFeatureScreenshotRepository {
  findManyByFeatureIdSortByPriorityDesc(featureId: string): Promise<ProductFeatureScreenshot[]>;
}

export const ProductFeatureScreenshotRepositoryToken = new Token<ProductFeatureScreenshotRepository>(
  'ProductFeatureScreenshotRepository'
);
