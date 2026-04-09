import { Token } from 'typedi';
import type { Magazine } from '../entities/Magazine';

export interface MagazineRepository {
  findPublishedOneBySlug(slug: string): Promise<Magazine | null>;
  findPublishedOneById(id: string): Promise<Magazine | null>;
  findOneById(id: string): Promise<Magazine | null>;
  findOneBySlug(slug: string): Promise<Magazine | null>;
  findAllWithPagination(page: number, limit: number): Promise<{ data: Magazine[]; total: number }>;
  insert(values: Magazine): Promise<Magazine | null>;
  updateById(id: string, modifier: (magazine: Magazine) => Magazine): Promise<Magazine>;
}

export const MagazineRepositoryToken = new Token<MagazineRepository>('MagazineRepository');
