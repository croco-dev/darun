import { describe, expect, it, vi } from 'vitest';
import { Category } from '../entities/Category';
import { Product } from '../entities/Product';
import { ProductFeature } from '../entities/ProductFeature';
import { ProductLink } from '../entities/ProductLink';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import type { ProductLinkRepository } from '../repositories/ProductLinkRepository';
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
    it('제품 설명을 생성하고 업데이트한다 (기본)', async () => {
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

      expect(generator.generate).toHaveBeenCalledWith(product, {
        features: undefined,
        links: undefined,
        categoryLabels: undefined,
      });
      expect(result.description).toBe('AI가 생성한 설명');
    });

    it('주요 기능, 링크, 카테고리 정보가 주입되면 context에 포함하여 생성기에 전달한다', async () => {
      const repository = createMockRepository();
      const generator = createMockGenerator();
      const product = new Product({
        id: 'prod-1',
        name: 'Cursor',
        slug: 'cursor',
        logoUrl: 'https://example.com/logo.png',
        summary: 'AI Code Editor',
        categoryIds: ['cat-dev'],
      });

      const featureRepo: Pick<ProductFeatureRepository, 'findManyByProductId'> = {
        findManyByProductId: vi.fn().mockResolvedValue([
          new ProductFeature({
            id: 'feat-1',
            productId: 'prod-1',
            name: 'AI Code Generation',
            summary: 'Generates code automatically',
            emoji: '🤖',
          }),
        ]),
      };

      const linkRepo: Pick<ProductLinkRepository, 'findManyByProductId'> = {
        findManyByProductId: vi.fn().mockResolvedValue([
          new ProductLink({
            id: 'link-1',
            productId: 'prod-1',
            title: 'Official Website',
            link: 'https://cursor.com',
            displayLink: 'cursor.com',
            iconUrl: 'https://cursor.com/favicon.ico',
          }),
        ]),
      };

      const categoryRepo: Pick<CategoryRepository, 'findOneById'> = {
        findOneById: vi.fn().mockResolvedValue(
          new Category({
            id: 'cat-dev',
            slug: 'dev-tools',
            labelKo: '개발 도구',
            labelEn: 'Developer Tools',
          })
        ),
      };

      vi.mocked(repository.findOneById).mockResolvedValue(product);
      vi.mocked(generator.generate).mockResolvedValue('<p>Cursor는 AI 코드 에디터입니다.</p>');
      vi.mocked(repository.updateById).mockImplementation(async (_id, modifier) => modifier(product));

      const usecase = new GenerateProductDescription(
        repository as never,
        generator,
        featureRepo as never,
        linkRepo as never,
        categoryRepo as never
      );

      const result = await usecase.execute({ productId: 'prod-1' });

      expect(generator.generate).toHaveBeenCalledWith(product, {
        features: [{ name: 'AI Code Generation', summary: 'Generates code automatically' }],
        links: [{ title: 'Official Website', link: 'https://cursor.com' }],
        categoryLabels: ['개발 도구'],
      });
      expect(result.description).toBe('<p>Cursor는 AI 코드 에디터입니다.</p>');
    });

    it('연관 데이터 조회 중 오류가 발생해도 상품 설명 생성은 중단되지 않는다', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const repository = createMockRepository();
      const generator = createMockGenerator();
      const product = new Product({
        id: 'prod-1',
        name: '테스트',
        slug: 'test',
        logoUrl: 'https://example.com/logo.png',
        summary: '요약',
        categoryIds: ['cat-1'],
      });

      const featureRepo = {
        findManyByProductId: vi.fn().mockRejectedValue(new Error('Feature DB error')),
      };
      const linkRepo = {
        findManyByProductId: vi.fn().mockRejectedValue(new Error('Link DB error')),
      };
      const categoryRepo = {
        findOneById: vi.fn().mockRejectedValue(new Error('Category DB error')),
      };

      vi.mocked(repository.findOneById).mockResolvedValue(product);
      vi.mocked(generator.generate).mockResolvedValue('<p>설명</p>');
      vi.mocked(repository.updateById).mockImplementation(async (_id, modifier) => modifier(product));

      const usecase = new GenerateProductDescription(
        repository as never,
        generator,
        featureRepo as never,
        linkRepo as never,
        categoryRepo as never
      );

      const result = await usecase.execute({ productId: 'prod-1' });

      expect(generator.generate).toHaveBeenCalledWith(product, {
        features: undefined,
        links: undefined,
        categoryLabels: undefined,
      });
      expect(result.description).toBe('<p>설명</p>');
      expect(warnSpy).toHaveBeenCalled();
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
