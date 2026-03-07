export enum ProductFeatureErrorCode {
  CreateFailed = 'product/create-failed',
}

export const productFeatureCreateFailed = () => new Error(ProductFeatureErrorCode.CreateFailed);
