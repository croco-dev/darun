import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import { PublishProduct } from '../usecases/PublishProduct';

function createMockRepository(): Pick<ProductRepository, 'updateById'> {
  return { updateById: vi.fn() };
}

describe('PublishProduct', () => {
  describe('execute', () => {
    it('제품을 publish하고 반환한다', async () => {
      const repository = createMockRepository();
      const product = new Product({
        id: 'prod-1',
        name: '테스트',
        slug: 'test',
        logoUrl: 'https://example.com/logo.png',
        summary: '요약',
      });

      vi.mocked(repository.updateById).mockImplementation(async (_id, modifier) => modifier(product));

      const usecase = new PublishProduct(repository as never);
      const result = await usecase.execute({ id: 'prod-1' });

      expect(repository.updateById).toHaveBeenCalledWith('prod-1', expect.any(Function));
      expect(result.publishedAt).toBeInstanceOf(Date);
    });
  });
});
