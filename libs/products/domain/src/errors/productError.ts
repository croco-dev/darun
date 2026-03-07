export enum ProductError {
  CreateFailed = 'product/create-failed',
  SlugAlreadyExists = 'product/slug-already-exists',
}

export const productCreateFailed = () => new Error(ProductError.CreateFailed);
export const productSlugAlreadyExists = () => new Error(ProductError.SlugAlreadyExists);
