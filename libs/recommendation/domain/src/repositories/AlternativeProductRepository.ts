import { Token } from 'typedi';
import { AlternativeProduct } from '../entities/AlternativeProduct';

export interface AlternativeProductRepository {
  replaceByProductId(productId: string, alternativeProductIds: string[]): Promise<void>;
  findManyByProductId(productId: string): Promise<AlternativeProduct[]>;
  create(data: AlternativeProduct): Promise<AlternativeProduct>;
  deleteMany(removedAlternatives: AlternativeProduct[]): Promise<boolean>;
  createMany(newAlternatives: AlternativeProduct[]): Promise<AlternativeProduct[]>;
}

export const AlternativeProductRepositoryToken = new Token<AlternativeProductRepository>(
  'AlternativeProductRepository'
);
