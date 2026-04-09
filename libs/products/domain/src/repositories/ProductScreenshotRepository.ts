import { Token } from 'typedi';
import type { ProductScreenshot } from '../entities/ProductScreenshot';

export interface ProductScreenshotRepository {
  findManyByProductIdSortByPriorityDesc(productId: string): Promise<ProductScreenshot[]>;
  insert(productScreenshot: ProductScreenshot): Promise<ProductScreenshot>;
}

export const ProductScreenshotRepositoryToken = new Token<ProductScreenshotRepository>('ProductScreenshotRepository');
