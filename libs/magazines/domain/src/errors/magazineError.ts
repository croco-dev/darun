import { createDomainError } from '@darun/utils-error';

export enum MagazineError {
  NotFound = 'magazine/not-found',
  CreateFailed = 'magazine/create-failed',
  SlugAlreadyExists = 'magazine/slug-already-exists',
  UpdateFailed = 'magazine/update-failed',
  InvalidArgs = 'magazine/invalid-args',
}

export const magazineNotFound = () => createDomainError(MagazineError.NotFound);
export const magazineCreateFailed = () => createDomainError(MagazineError.CreateFailed);
export const magazineSlugAlreadyExists = () => createDomainError(MagazineError.SlugAlreadyExists);
export const magazineUpdateFailed = () => createDomainError(MagazineError.UpdateFailed);
export const magazineInvalidArgs = (message?: string) => createDomainError(MagazineError.InvalidArgs, message);
