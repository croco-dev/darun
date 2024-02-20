import { Token } from 'typedi';
import { Product } from '../entities/Product';

export interface ProductRepository {
  findTop4SortByPublishedAtDesc(): Promise<Product[]>;

  findOneById(id: string): Promise<Product | null>;

  findOneBySlug(slug: string): Promise<Product | null>;

  countAll(): Promise<number>;
}

export const ProductRepositoryToken = new Token<ProductRepository>('ProductRepository');
