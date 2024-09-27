import { Token } from 'typedi';
import { Product } from '../entities/Product';

export interface ProductRepository {
  updateById(id: string, modifier: (product: Product) => Product): Promise<Product>;
  findAllByBeforeIdAndLimit(limit: number, id?: string): Promise<Product[]>;
  findAllByAfterIdAndLimit(limit: number, id?: string): Promise<Product[]>;
  findTopNSortByPublishedAtDesc(n: number): Promise<Product[]>;
  findPublishedOneById(id: string): Promise<Product | null>;
  findOneBySlug(slug: string): Promise<Product | null>;
  findOneById(id: string): Promise<Product | null>;
  findPublishedOneBySlug(slug: string): Promise<Product | null>;
  countPublishedAll(): Promise<number>;
  countAll(): Promise<number>;
  insert(values: Product): Promise<Product | null>;
}

export const ProductRepositoryToken = new Token<ProductRepository>('ProductRepository');
