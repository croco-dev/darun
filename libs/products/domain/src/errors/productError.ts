export enum ProductError {
  NotFound = 'product/not-found',
  SlugAlreadyExists = 'product/slug-already-exists',
  CreateFailed = 'product/create-failed',
  UpdateFailed = 'product/update-failed',
  DeleteFailed = 'product/delete-failed',
  FeatureNotFound = 'product/feature-not-found',
}

export const productNotFound = () => new Error(ProductError.NotFound);
export const productSlugAlreadyExists = () => new Error(ProductError.SlugAlreadyExists);
export const productCreateFailed = () => new Error(ProductError.CreateFailed);
export const productUpdateFailed = () => new Error(ProductError.UpdateFailed);
export const productDeleteFailed = () => new Error(ProductError.DeleteFailed);
export const productFeatureNotFound = () => new Error(ProductError.FeatureNotFound);
