import { Token } from 'typedi';
import type { Product } from '../entities/Product';

export const ProductResearchMaterializationRepositoryToken =
  new Token<ProductResearchMaterializationRepository>('ProductResearchMaterializationRepository');

export type ReviewedResearchFeature = {
  name: string;
  summary: string;
  emoji: string;
};

export type ValidatedReviewedProductInput = {
  researchJobId: string;
  name: string;
  slug: string;
  summary: string;
  logoUrl: string;
  officialUrl: string;
  categoryIds: string[];
  features: ReviewedResearchFeature[];
  tags: string[];
};

export interface ProductResearchMaterializationRepository {
  materialize(input: ValidatedReviewedProductInput): Promise<{
    product: Product;
    alreadyCreated: boolean;
  }>;
}
