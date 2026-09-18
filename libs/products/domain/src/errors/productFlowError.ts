import { createDomainError } from '@darun/utils-error';

export enum ProductFlowError {
  NotFound = 'product-flow/not-found',
  InvalidArgs = 'product-flow/invalid-args',
  WritesDisabled = 'product-flow/writes-disabled',
  ScreenshotInUse = 'product-screenshot/in-use',
}

export const productFlowNotFound = () => createDomainError(ProductFlowError.NotFound);
export const productFlowInvalidArgs = (message?: string) => createDomainError(ProductFlowError.InvalidArgs, message);
export const productFlowWritesDisabled = () => createDomainError(ProductFlowError.WritesDisabled);
export const productScreenshotInUse = () => createDomainError(ProductFlowError.ScreenshotInUse);
