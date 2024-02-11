import { Token } from 'typedi';
import { Product } from '../entities/Product';

export interface ProductRepository {
  findTop4SortByCreatedAtDesc(): Promise<Product[]>;
}

export const ProductRepositoryToken = new Token<ProductRepository>('ProductRepository');
