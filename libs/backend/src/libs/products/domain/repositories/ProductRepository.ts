import { Token } from 'typedi';
import { Product } from '../entities/Product';

export interface ProductRepository {
  findTopNSortByPublishedAtDesc(n: number): Promise<Product[]>;

  findPublishedOneById(id: string): Promise<Product | null>;

  findOneBySlug(slug: string): Promise<Product | null>;

  findPublishedOneBySlug(slug: string): Promise<Product | null>;

  countPublishedAll(): Promise<number>;

  insert(values: Product): Promise<boolean>;
}

export const ProductRepositoryToken = new Token<ProductRepository>('ProductRepository');
