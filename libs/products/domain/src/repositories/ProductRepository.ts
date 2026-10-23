import { Token } from 'typedi';
import { Product } from '../entities/Product';
import type { ProductScreenshot } from '../entities/ProductScreenshot';

export interface ProductRepository {
  updateById(id: string, modifier: (product: Product) => Product): Promise<Product>;
  findAllByBeforeIdAndLimit(limit: number, id?: string): Promise<Product[]>;
  findAllByAfterIdAndLimit(limit: number, id?: string): Promise<Product[]>;
  findPublishedByAfterIdAndLimit(limit: number, id?: string): Promise<Product[]>;
  findTopNSortByPublishedAtDesc(n: number): Promise<Product[]>;
  findPublishedByIds(ids: string[]): Promise<(Product | null)[]>;
  findPublishedOneById(id: string): Promise<Product | null>;
  findOneBySlug(slug: string): Promise<Product | null>;
  findOneById(id: string): Promise<Product | null>;
  findOneFreshById(id: string): Promise<Product | null>;
  findPublishedOneBySlug(slug: string): Promise<Product | null>;
  findPublishedByCategoryId(categoryId: string, limit: number, afterId?: string): Promise<Product[]>;
  countPublishedByCategoryId(categoryId: string): Promise<number>;
  findVisualApps(params: {
    limit: number;
    afterId?: string;
    query?: string;
    productSlug?: string;
  }): Promise<{ products: Product[]; total: number }>;
  findVisualAppPreviews(productId: string): Promise<ProductScreenshot[]>;
  findVisualAppCover(productId: string): Promise<ProductScreenshot | null>;
  countVisualAppScreenshots(productId: string): Promise<number>;
  hasPublishedAlternatives(productId: string): Promise<boolean>;
  findPublishedByCategoryIdAndLimit(categoryId: string, limit: number): Promise<Product[]>;
  countPublishedAll(): Promise<number>;
  countAll(): Promise<number>;
  insert(values: Product): Promise<Product | null>;
}

export const ProductRepositoryToken = new Token<ProductRepository>('ProductRepository');
