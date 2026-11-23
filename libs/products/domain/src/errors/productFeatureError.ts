import { createDomainError } from '@darun/utils-error';
import { isProductFeatureTextTooLong, PRODUCT_FEATURE_TEXT_LIMITS } from '../feature/ProductFeatureText';

export enum ProductFeatureErrorCode {
  CreateFailed = 'product-feature/create-failed',
  NotFound = 'product-feature/not-found',
  UpdateFailed = 'product-feature/update-failed',
  NameTooLong = 'product-feature/name-too-long',
  SummaryTooLong = 'product-feature/summary-too-long',
}

export const productFeatureCreateFailed = () => createDomainError(ProductFeatureErrorCode.CreateFailed);
export const productFeatureNotFound = () => createDomainError(ProductFeatureErrorCode.NotFound);
export const productFeatureUpdateFailed = () => createDomainError(ProductFeatureErrorCode.UpdateFailed);

export function assertProductFeatureTextLengths(name?: string, summary?: string | null) {
  if (isProductFeatureTextTooLong('name', name)) {
    throw createDomainError(
      ProductFeatureErrorCode.NameTooLong,
      `Feature name must be at most ${PRODUCT_FEATURE_TEXT_LIMITS.name} characters.`
    );
  }
  if (isProductFeatureTextTooLong('summary', summary)) {
    throw createDomainError(
      ProductFeatureErrorCode.SummaryTooLong,
      `Feature summary must be at most ${PRODUCT_FEATURE_TEXT_LIMITS.summary} characters.`
    );
  }
}
