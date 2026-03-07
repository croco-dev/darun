export enum MagazineError {
  CreateFailed = 'magazine/create-failed',
  SlugAlreadyExists = 'magazine/slug-already-exists',
}

export const magazineCreateFailed = () => new Error(MagazineError.CreateFailed);
export const magazineSlugAlreadyExists = () => new Error(MagazineError.SlugAlreadyExists);
