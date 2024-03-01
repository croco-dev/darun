import { Token } from 'typedi';
import { AlternativeProduct } from '../entities/AlternativeProduct';

export interface AlternativeProductRepository {
  findManyByProductId(productId: string): Promise<AlternativeProduct[]>;
}

export const AlternativeProductRepositoryToken = new Token<AlternativeProductRepository>(
  'AlternativeProductRepository'
);
