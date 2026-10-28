import { vi } from 'vitest';
import type { ProductRepository } from '../repositories/ProductRepository';

export function createMockRepository(): ProductRepository {
  return {
    publishById: vi.fn(),
    registerCompanyById: vi.fn(),
    updateById: vi.fn(),
    findAllByBeforeIdAndLimit: vi.fn(),
    findAllByAfterIdAndLimit: vi.fn(),
    findPublishedByAfterIdAndLimit: vi.fn(),
    findTopNSortByPublishedAtDesc: vi.fn(),
    findPublishedByIds: vi.fn(),
    findPublishedOneById: vi.fn(),
    findOneBySlug: vi.fn(),
    findOneById: vi.fn(),
    findOneFreshById: vi.fn(),
    findPublishedOneBySlug: vi.fn(),
    findPublishedByCategoryId: vi.fn(),
    countPublishedByCategoryId: vi.fn(),
    findVisualApps: vi.fn(),
    findVisualAppPreviews: vi.fn().mockResolvedValue([]),
    findVisualAppCover: vi.fn(),
    countVisualAppScreenshots: vi.fn(),
    hasPublishedAlternatives: vi.fn(),
    findPublishedByCategoryIdAndLimit: vi.fn(),
    countPublishedAll: vi.fn(),
    countAll: vi.fn(),
    insert: vi.fn(),
  };
}
