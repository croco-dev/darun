import { createDomainError } from '@darun/utils-error';

export enum ProductError {
  NotFound = 'product/not-found',
  SlugAlreadyExists = 'product/slug-already-exists',
  CreateFailed = 'product/create-failed',
  UpdateFailed = 'product/update-failed',
  DeleteFailed = 'product/delete-failed',
  ScreenshotNotFound = 'product-screenshot/not-found',
  InvalidArgs = 'product/invalid-args',
  CompanyNotFound = 'product/company-not-found',
  CategoryNotFound = 'product/category-not-found',
  ScreenshotInsertFailed = 'product/screenshot-insert-failed',
  LinkNotFound = 'product/link-not-found',
  LinkInsertFailed = 'product/link-insert-failed',
}

export const productNotFound = () => createDomainError(ProductError.NotFound);
export const productSlugAlreadyExists = () => createDomainError(ProductError.SlugAlreadyExists);
export const productCreateFailed = () => createDomainError(ProductError.CreateFailed);
export const productUpdateFailed = () => createDomainError(ProductError.UpdateFailed);
export const productDeleteFailed = () => createDomainError(ProductError.DeleteFailed);
export const productScreenshotNotFound = () => createDomainError(ProductError.ScreenshotNotFound);
export const productInvalidArgs = (message?: string) => createDomainError(ProductError.InvalidArgs, message);
export const productCompanyNotFound = () => createDomainError(ProductError.CompanyNotFound);
export const productCategoryNotFound = () => createDomainError(ProductError.CategoryNotFound);
export const productScreenshotInsertFailed = () => createDomainError(ProductError.ScreenshotInsertFailed);
export const productLinkNotFound = () => createDomainError(ProductError.LinkNotFound);
export const productLinkInsertFailed = () => createDomainError(ProductError.LinkInsertFailed);
