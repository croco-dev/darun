import { Token } from 'typedi';
import { Magazine } from '../entities/Magazine';

export interface MagazineRepository {
  findPublishedOneBySlug(slug: string): Promise<Magazine | null>;
  findPublishedOneById(id: string): Promise<Magazine | null>;
  findOneById(id: string): Promise<Magazine | null>;
  findOneBySlug(slug: string): Promise<Magazine | null>;
  insert(values: Magazine): Promise<Magazine | null>;
}

export const MagazineRepositoryToken = new Token<MagazineRepository>('MagazineRepository');
