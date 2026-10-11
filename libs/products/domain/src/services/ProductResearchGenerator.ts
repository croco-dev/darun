import { Token } from 'typedi';
import type { ProductResearchDraftV1 } from '../entities/ProductResearchJobEntity';

export type ProductResearchLlmInput = {
  originalUrl: string;
  inputHostname: string;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    hostname: string;
    snippet: string;
    extraSnippets: string[];
    relationToInput: 'INPUT_HOST_MATCH' | 'EXTERNAL';
  }>;
  categories: Array<{ id: string; slug: string; labelKo: string; labelEn: string }>;
};

export interface ProductResearchGenerator {
  generate(
    input: ProductResearchLlmInput,
    options?: { model?: string }
  ): Promise<{ draft: ProductResearchDraftV1; model: string; promptVersion: string }>;
}

export const ProductResearchGeneratorToken = new Token<ProductResearchGenerator>('ProductResearchGenerator');
