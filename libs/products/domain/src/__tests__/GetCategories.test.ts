import { describe, expect, it, vi } from 'vitest';
import { Category } from '../entities/Category';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import { GetCategories } from '../usecases/GetCategories';
import { GetCategoryBySlug } from '../usecases/GetCategoryBySlug';

const categories = [
  new Category({ id: 'category-1', slug: 'ai', labelKo: '인공지능', labelEn: 'AI' }),
  new Category({ id: 'category-2', slug: 'design', labelKo: '디자인', labelEn: 'Design' }),
];

const createRepository = (): CategoryRepository => ({
  findOneBySlug: vi.fn<CategoryRepository['findOneBySlug']>().mockResolvedValue(null),
  findOneById: vi.fn<CategoryRepository['findOneById']>().mockResolvedValue(null),
  findAll: vi.fn<CategoryRepository['findAll']>().mockResolvedValue(categories),
  insert: vi.fn<CategoryRepository['insert']>().mockResolvedValue(null),
  updateById: vi.fn<CategoryRepository['updateById']>(),
});

describe('GetCategoryBySlug', () => {
  it('uses the exact repository slug lookup and preserves missing/error results', async () => {
    const repository = createRepository();
    const useCase = new GetCategoryBySlug(repository);
    vi.mocked(repository.findOneBySlug).mockResolvedValueOnce(categories[1]);
    await expect(useCase.execute('design')).resolves.toBe(categories[1]);
    expect(repository.findOneBySlug).toHaveBeenCalledExactlyOnceWith('design');
    await expect(useCase.execute('missing')).resolves.toBeNull();
    vi.mocked(repository.findOneBySlug).mockRejectedValueOnce(new Error('unavailable'));
    await expect(useCase.execute('design')).rejects.toThrow('unavailable');
    expect(repository.findAll).not.toHaveBeenCalled();
  });
});

describe('GetCategories', () => {
  it('returns the requested number of categories in repository order', async () => {
    const repository = createRepository();

    await expect(new GetCategories(repository).execute({ first: 1 })).resolves.toEqual([categories[0]]);
    expect(repository.findAll).toHaveBeenCalledOnce();
  });

  it('returns no categories when first is negative', async () => {
    await expect(new GetCategories(createRepository()).execute({ first: -1 })).resolves.toEqual([]);
  });
});
