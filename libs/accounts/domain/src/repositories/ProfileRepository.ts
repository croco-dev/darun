import { Token } from 'typedi';
import type { Profile } from '../entities/Profile';

export interface ProfileRepository {
  findByUserId: (id: string) => Promise<Profile | null>;
}

export const ProfileRepositoryToken = new Token<ProfileRepository>('ProfileRepository');
