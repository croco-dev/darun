import { createDomainError } from '@darun/utils-error';

export enum MagazineError {
  NotFound = 'magazine/not-found',
  CreateFailed = 'magazine/create-failed',
  SlugAlreadyExists = 'magazine/slug-already-exists',
}

export const magazineNotFound = () => createDomainError(MagazineError.NotFound);
export const magazineCreateFailed = () => new Error(MagazineError.CreateFailed);
export const magazineSlugAlreadyExists = () => new Error(MagazineError.SlugAlreadyExists);
