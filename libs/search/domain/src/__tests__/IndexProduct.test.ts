import { describe, expect, it, vi } from 'vitest';
import type { SearchableProductRepository } from '../repositories/SearchableProductRepository';
import { IndexProduct } from '../usecases/IndexProduct';

function createMockRepository(): SearchableProductRepository {
  return {
    index: vi.fn(),
    searchProduct: vi.fn(),
  };
}

describe('IndexProduct', () => {
  describe('execute', () => {
    it('제품을 검색 인덱스에 등록한다', async () => {
      const repository = createMockRepository();
      vi.mocked(repository.index).mockResolvedValue(true);

      const usecase = new IndexProduct(repository as never);
      const result = await usecase.execute({
        id: 'prod-1',
        name: '테스트 제품',
        slug: 'test-product',
        summary: '요약',
        tags: ['tag1', 'tag2'],
        category: 'tools',
        votes: 10,
      });

      expect(repository.index).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({
          name: '테스트 제품',
          slug: 'test-product',
          summary: '요약',
        })
      );
      expect(result).toBe(true);
    });

    it('옵션 필드 없이도 인덱싱이 가능하다', async () => {
      const repository = createMockRepository();
      vi.mocked(repository.index).mockResolvedValue(true);

      const usecase = new IndexProduct(repository as never);
      await usecase.execute({ id: 'prod-2', name: '최소 제품', slug: 'minimal', summary: '요약' });

      expect(repository.index).toHaveBeenCalledOnce();
    });
  });
});
