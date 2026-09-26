import { Token } from 'typedi';
import type { ProductDescriptionDocument } from './ProductDescriptionDocument';
import type { ProductDescriptionEvidence } from './ProductDescriptionEvidenceAssembler';

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
    options?: { model?: string }
  ): Promise<ProductDescriptionGenerationResult>;
}

export const ProductDescriptionGeneratorToken = new Token<ProductDescriptionGenerator>('ProductDescriptionGenerator');
