import { Token } from 'typedi';
import type { ProductDescriptionDocument } from './ProductDescriptionDocument';
import type { ProductDescriptionEvidence } from './ProductDescriptionEvidenceProjector';

export interface ProductDescriptionGenerationResult {
  document: ProductDescriptionDocument;
  candidateHtml: string;
  writerModel: string;
  reviewerModel: string;
  writerPromptVersion: string;
  reviewerPromptVersion: string;
  rendererVersion: string;
}

export interface ProductDescriptionGenerator {
  generate(
    evidence: ProductDescriptionEvidence,
    options?: { model?: string; signal?: AbortSignal; deadline?: Date }
  ): Promise<ProductDescriptionGenerationResult>;
}

export const ProductDescriptionGeneratorToken = new Token<ProductDescriptionGenerator>('ProductDescriptionGenerator');
