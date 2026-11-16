import { Token } from 'typedi';
import { Profile } from '../entities/Profile';

export interface ProfileRepository {
  findManyByUserIds: (ids: readonly string[]) => Promise<(Profile | null)[]>;
  findByUserId: (id: string) => Promise<Profile | null>;
}

export const ProfileRepositoryToken = new Token<ProfileRepository>('ProfileRepository');
