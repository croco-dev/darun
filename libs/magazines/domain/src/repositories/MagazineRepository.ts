import { Token } from 'typedi';
import { Magazine } from '../entities/Magazine';
import type { PublishedMagazineCursor, PublishedMagazinePage } from './PublishedMagazinePage';

export interface MagazineRepository {
  publishById(id: string, expectedRevision: number): Promise<Magazine>;
  findPublishedOneBySlug(slug: string): Promise<Magazine | null>;
  findPublishedOneById(id: string): Promise<Magazine | null>;
  findOneById(id: string): Promise<Magazine | null>;
  findOneBySlug(slug: string): Promise<Magazine | null>;
  findAllWithPagination(page: number, limit: number): Promise<{ data: Magazine[]; total: number }>;
  findPublishedPage(first: number, after?: PublishedMagazineCursor): Promise<PublishedMagazinePage>;
  findPublishedContentsByIds(ids: readonly string[]): Promise<(string | null)[]>;
  insert(values: Magazine): Promise<Magazine | null>;
  updateById(id: string, modifier: (magazine: Magazine) => Magazine, expectedRevision: number): Promise<Magazine>;
}

export const MagazineRepositoryToken = new Token<MagazineRepository>('MagazineRepository');
