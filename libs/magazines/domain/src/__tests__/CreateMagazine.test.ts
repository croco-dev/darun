import { describe, expect, it, vi } from 'vitest';
import { Magazine } from '../entities/Magazine';
import type { MagazineRepository } from '../repositories/MagazineRepository';
import { CreateMagazine } from '../usecases/CreateMagazine';

function createMockRepository(): MagazineRepository {
  return {
    findPublishedOneBySlug: vi.fn(),
    findPublishedOneById: vi.fn(),
    findOneById: vi.fn(),
    findOneBySlug: vi.fn(),
    findAllWithPagination: vi.fn(),
    findAllPublished: vi.fn(),
    insert: vi.fn(),
    updateById: vi.fn(),
  };
}

describe('CreateMagazine', () => {
  describe('execute', () => {
    it('매거진을 생성하고 저장된 결과를 반환한다', async () => {
      const repository = createMockRepository();
      const inserted = new Magazine({
        id: 'mag-1',
        title: '테스트',
        backgroundImageUrl: 'https://example.com/bg.png',
        authorId: 'author-1',
      });
      vi.mocked(repository.insert).mockResolvedValue(inserted);

      const usecase = new CreateMagazine(repository as never);
      const result = await usecase.execute({
        title: '테스트',
        backgroundImageUrl: 'https://example.com/bg.png',
        authorId: 'author-1',
      });

      expect(repository.insert).toHaveBeenCalledOnce();
      expect(result).toBe(inserted);
    });

    it('insert가 null을 반환하면 에러를 던진다', async () => {
      const repository = createMockRepository();
      vi.mocked(repository.insert).mockResolvedValue(null);

      const usecase = new CreateMagazine(repository as never);

      await expect(
        usecase.execute({ title: '테스트', backgroundImageUrl: 'https://example.com/bg.png', authorId: 'author-1' })
      ).rejects.toThrow();
    });
  });
});
