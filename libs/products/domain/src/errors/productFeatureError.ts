import { createDomainError } from '@darun/utils-error';

export enum ProductFeatureErrorCode {
  CreateFailed = 'product-feature/create-failed',
  NotFound = 'product-feature/not-found',
  UpdateFailed = 'product-feature/update-failed',
}

export const productFeatureCreateFailed = () => createDomainError(ProductFeatureErrorCode.CreateFailed);
export const productFeatureNotFound = () => createDomainError(ProductFeatureErrorCode.NotFound);
export const productFeatureUpdateFailed = () => createDomainError(ProductFeatureErrorCode.UpdateFailed);
