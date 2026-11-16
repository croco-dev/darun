import type { Magazine } from '../entities/Magazine';
import { magazineInvalidArgs } from '../errors/magazineError';

export interface PublishedMagazineCursor {
  publishedAt: string;
  id: string;
}

export type MagazineSummary = Pick<
  Magazine,
  'id' | 'revision' | 'slug' | 'title' | 'summary' | 'backgroundImageUrl' | 'authorId' | 'publishedAt' | 'updatedAt'
>;

export interface PublishedMagazinePage {
  items: { magazine: MagazineSummary; position: PublishedMagazineCursor }[];
  hasNextPage: boolean;
}

export function validatePublishedMagazinePage(first: number, after?: PublishedMagazineCursor): void {
  if (!Number.isInteger(first) || first < 1 || first > 100)
    throw magazineInvalidArgs('first must be between 1 and 100');
  if (
    after &&
    (!/^[0-9A-Za-z-]{1,26}$/.test(after.id) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/.test(after.publishedAt) ||
      !Number.isFinite(Date.parse(`${after.publishedAt}Z`)) ||
      new Date(`${after.publishedAt}Z`).toISOString().slice(0, 19) !== after.publishedAt.slice(0, 19))
  ) {
    throw magazineInvalidArgs('Invalid magazine cursor');
  }
}
