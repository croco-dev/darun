import { Token } from 'typedi';
import { AlternativeProduct } from '../entities/AlternativeProduct';

export type AlternativeProductExclusion = {
  productId: string;
  alternativeProductId: string;
  note: string | null;
};

export interface AlternativeProductRepository {
  replaceByProductId(productId: string, alternativeProductIds: string[]): Promise<void>;
  findManyByProductId(productId: string): Promise<AlternativeProduct[]>;
  findExclusionsByProductId(productId: string): Promise<AlternativeProductExclusion[]>;
  exclude(exclusion: AlternativeProductExclusion): Promise<void>;
  restore(productId: string, alternativeProductId: string): Promise<void>;
  create(data: AlternativeProduct): Promise<AlternativeProduct>;
  deleteMany(removedAlternatives: AlternativeProduct[]): Promise<boolean>;
  createMany(newAlternatives: AlternativeProduct[]): Promise<AlternativeProduct[]>;
}

export const AlternativeProductRepositoryToken = new Token<AlternativeProductRepository>(
  'AlternativeProductRepository'
);
