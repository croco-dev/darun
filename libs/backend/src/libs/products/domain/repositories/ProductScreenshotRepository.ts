import { Token } from 'typedi';
import { ProductScreenshot } from '../entities/ProductScreenshot';

export interface ProductScreenshotRepository {
  findManyByProductIdSortByPriorityDesc(productId: string): Promise<ProductScreenshot[]>;
  insert(productScreenshot: ProductScreenshot): Promise<ProductScreenshot>;
}

export const ProductScreenshotRepositoryToken = new Token<ProductScreenshotRepository>('ProductScreenshotRepository');
