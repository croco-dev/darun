import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { CreateProduct } from '../usecases/CreateProduct';

function createMockRepository(): ProductRepository {
  return {
    updateById: vi.fn(),
    findAllByBeforeIdAndLimit: vi.fn(),
    findAllByAfterIdAndLimit: vi.fn(),
    findPublishedByAfterIdAndLimit: vi.fn(),
    findTopNSortByPublishedAtDesc: vi.fn(),
    findPublishedByIds: vi.fn(),
    findPublishedOneById: vi.fn(),
    findOneBySlug: vi.fn(),
    findOneById: vi.fn(),
    findPublishedOneBySlug: vi.fn(),
    findPublishedByCategoryId: vi.fn(),
    findPublishedByCategoryIdAndLimit: vi.fn(),
    countPublishedAll: vi.fn(),
    countAll: vi.fn(),
    insert: vi.fn(),
  };
}

describe('CreateProduct', () => {
  describe('execute', () => {
    it('slug가 없으면 제품을 생성하고 반환한다', async () => {
      const repository = createMockRepository();
      vi.mocked(repository.findOneBySlug).mockResolvedValue(null);
      const inserted = new Product({
        id: 'prod-1',
        name: '테스트',
        slug: 'test',
        logoUrl: 'https://example.com/logo.png',
        summary: '요약',
      });
      vi.mocked(repository.insert).mockResolvedValue(inserted);

      const usecase = new CreateProduct(repository as never);
      const result = await usecase.execute({
        name: '테스트',
        slug: 'test',
        logoUrl: 'https://example.com/logo.png',
        summary: '요약',
      });

      expect(repository.findOneBySlug).toHaveBeenCalledWith('test');
      expect(repository.insert).toHaveBeenCalledOnce();
      expect(result).toBe(inserted);
    });

    it('slug가 이미 존재하면 에러를 던진다', async () => {
      const repository = createMockRepository();
      const existing = new Product({
        id: 'prod-0',
        name: '기존',
        slug: 'test',
        logoUrl: 'https://example.com/logo.png',
        summary: '기존 요약',
      });
      vi.mocked(repository.findOneBySlug).mockResolvedValue(existing);

      const usecase = new CreateProduct(repository as never);

      await expect(
        usecase.execute({ name: '테스트', slug: 'test', logoUrl: 'https://example.com/logo.png', summary: '요약' })
      ).rejects.toThrow();
    });

    it('insert가 null을 반환하면 에러를 던진다', async () => {
      const repository = createMockRepository();
      vi.mocked(repository.findOneBySlug).mockResolvedValue(null);
      vi.mocked(repository.insert).mockResolvedValue(null);

      const usecase = new CreateProduct(repository as never);

      await expect(
        usecase.execute({ name: '테스트', slug: 'test', logoUrl: 'https://example.com/logo.png', summary: '요약' })
      ).rejects.toThrow();
    });

    it('DB unique violation 에러가 발생하면 slug 중복 에러를 던진다', async () => {
      const repository = createMockRepository();
      vi.mocked(repository.findOneBySlug).mockResolvedValue(null);
      vi.mocked(repository.insert).mockRejectedValue({ code: '23505' });

      const usecase = new CreateProduct(repository as never);

      await expect(
        usecase.execute({ name: '테스트', slug: 'test', logoUrl: 'https://example.com/logo.png', summary: '요약' })
      ).rejects.toThrow();
    });
  });
});
