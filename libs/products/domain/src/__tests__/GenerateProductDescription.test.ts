import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import type { ProductRepository } from '../repositories/ProductRepository';
import type { ProductDescriptionGenerator } from '../services/ProductDescriptionGenerator';
import { GenerateProductDescription } from '../usecases/GenerateProductDescription';

function createMockRepository(): Pick<ProductRepository, 'findOneById' | 'updateById'> {
  return { findOneById: vi.fn(), updateById: vi.fn() };
}

function createMockGenerator(): ProductDescriptionGenerator {
  return { generate: vi.fn() };
}

describe('GenerateProductDescription', () => {
  describe('execute', () => {
    it('제품 설명을 생성하고 업데이트한다', async () => {
      const repository = createMockRepository();
      const generator = createMockGenerator();
      const product = new Product({
        id: 'prod-1',
        name: '테스트',
        slug: 'test',
        logoUrl: 'https://example.com/logo.png',
        summary: '요약',
      });

      vi.mocked(repository.findOneById).mockResolvedValue(product);
      vi.mocked(generator.generate).mockResolvedValue('AI가 생성한 설명');
      vi.mocked(repository.updateById).mockImplementation(async (_id, modifier) => modifier(product));

      const usecase = new GenerateProductDescription(repository as never, generator);
      const result = await usecase.execute({ productId: 'prod-1' });

      expect(generator.generate).toHaveBeenCalledWith(product);
      expect(result.description).toBe('AI가 생성한 설명');
    });

    it('제품이 없으면 에러를 던진다', async () => {
      const repository = createMockRepository();
      const generator = createMockGenerator();
      vi.mocked(repository.findOneById).mockResolvedValue(null);

      const usecase = new GenerateProductDescription(repository as never, generator);

      await expect(usecase.execute({ productId: 'nonexistent' })).rejects.toThrow();
    });
  });
});
