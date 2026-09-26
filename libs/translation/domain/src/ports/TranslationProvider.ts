import { Token } from 'typedi';

export type TranslationMode = 'editorial' | 'product_copy' | 'label';

export interface SingleTranslationRequest {
  entityType: string;
  entityId: string;
  field: string;
  koreanText: string;
  mode: TranslationMode;
  isHtml?: boolean;
}

export interface SingleTranslationResult {
  translatedText: string;
  sourceHash: string;
  model: string;
  promptVersion: string;
}

export interface ProductBundleTranslationRequest {
  productId: string;
  name: string;
  summary: string;
  description: string;
  features: Array<{
    id: string;
    name: string;
    summary: string;
  }>;
}

export interface ProductBundleTranslationResult {
  product: {
    name: string;
    summary: string;
    description: string;
    nameSourceHash: string;
    summarySourceHash: string;
    descriptionSourceHash: string;
  };
  features: Array<{
    id: string;
    name: string;
    summary: string;
    nameSourceHash: string;
    summarySourceHash: string;
  }>;
  model: string;
  promptVersion: string;
}

export interface TranslationProvider {
  translateSingle(request: SingleTranslationRequest): Promise<SingleTranslationResult>;
  translateProductBundle(request: ProductBundleTranslationRequest): Promise<ProductBundleTranslationResult>;
}

export const TranslationProviderToken = new Token<TranslationProvider>('TranslationProvider');
