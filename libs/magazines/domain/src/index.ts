export type { MagazineRepository } from './repositories/MagazineRepository';
export { MagazineRepositoryToken } from './repositories/MagazineRepository';

export { Magazine } from './entities/Magazine';
export { MagazineError, magazineCreateFailed, magazineSlugAlreadyExists } from './errors/magazineError';
export { CreateMagazine } from './usecases/CreateMagazine';
export { EditMagazine } from './usecases/EditMagazine';
export { GetMagazine } from './usecases/GetMagazine';
export { GetMagazineList } from './usecases/GetMagazineList';
export { GetPublishedMagazine } from './usecases/GetPublishedMagazine';
export { PublishMagazine } from './usecases/PublishMagazine';
