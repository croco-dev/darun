import { createDomainError } from '@darun/utils-error';

export const alternativeProductConflict = (message: string) =>
  createDomainError('alternative-product/conflict', message);
