import 'reflect-metadata';

import { Category, GetCategories, GetCategoryBySlug, type CategoryRepository } from '@darun/products-domain';
import { buildSchema } from 'type-graphql';
import { Container } from 'typedi';
import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { CategoryQueryResolver } from '../Category.query.resolver';

const { graphql } = createRequire(import.meta.url)('graphql') as typeof import('graphql');

const createRepository = (): CategoryRepository => ({
  findOneBySlug: vi.fn<CategoryRepository['findOneBySlug']>().mockResolvedValue(null),
  findOneById: vi.fn<CategoryRepository['findOneById']>().mockResolvedValue(null),
  findAll: vi
    .fn<CategoryRepository['findAll']>()
    .mockResolvedValue([new Category({ id: 'category-1', slug: 'ai', labelKo: '인공지능', labelEn: 'AI' })]),
  insert: vi.fn<CategoryRepository['insert']>().mockResolvedValue(null),
  updateById: vi.fn<CategoryRepository['updateById']>(),
});

describe('CategoryQueryResolver', () => {
  it('exposes categories through the domain use case', async () => {
    const repository = createRepository();
    const resolver = new CategoryQueryResolver(new GetCategories(repository), new GetCategoryBySlug(repository));

    await expect(resolver.categories(8, 'ko')).resolves.toMatchObject([
      { id: 'category-1', slug: 'ai', labelKo: '인공지능', labelEn: 'AI' },
    ]);
  });

  it('registers the categories query in the generated schema', async () => {
    const schema = await buildSchema({
      resolvers: [CategoryQueryResolver],
      container: Container,
    });
    const field = schema.getQueryType()?.getFields().categories;

    expect(field?.args.map(argument => argument.name).sort()).toEqual(['first', 'locale']);
    expect(field?.type.toString()).toBe('[Category!]!');
    const single = schema.getQueryType()?.getFields().categoryBySlug;
    expect(single?.args.map(argument => argument.name)).toEqual(['slug']);
    expect(single?.type.toString()).toBe('Category');
  });

  it('finds an exact slug beyond the first 100 without reading the category list', async () => {
    const repository = createRepository();
    const categories = Array.from(
      { length: 101 },
      (_, index) =>
        new Category({
          id: `category-${index + 1}`,
          slug: `category-${index + 1}`,
          labelKo: `분류 ${index + 1}`,
          labelEn: `Category ${index + 1}`,
        })
    );
    vi.mocked(repository.findAll).mockResolvedValue(categories);
    vi.mocked(repository.findOneBySlug).mockImplementation(async slug => categories.find(c => c.slug === slug) ?? null);
    const resolver = new CategoryQueryResolver(new GetCategories(repository), new GetCategoryBySlug(repository));
    const schema = await buildSchema({
      resolvers: [CategoryQueryResolver],
      container: { get: () => resolver },
    });
    const result = await graphql({
      schema,
      source: '{ categoryBySlug(slug: "category-101") { id slug labelKo labelEn } }',
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      categoryBySlug: {
        id: 'category-101',
        slug: 'category-101',
        labelKo: '분류 101',
        labelEn: 'Category 101',
      },
    });
    expect(repository.findOneBySlug).toHaveBeenCalledExactlyOnceWith('category-101');
    expect(repository.findAll).not.toHaveBeenCalled();

    const missing = await graphql({ schema, source: '{ categoryBySlug(slug: "missing") { id } }' });
    expect(missing.errors).toBeUndefined();
    expect(missing.data).toEqual({ categoryBySlug: null });
    vi.mocked(repository.findOneBySlug).mockRejectedValueOnce(new Error('fixture unavailable'));
    const failed = await graphql({ schema, source: '{ categoryBySlug(slug: "category-101") { id } }' });
    expect(failed.errors?.[0].message).toBe('fixture unavailable');
    expect(failed.errors?.[0].path).toEqual(['categoryBySlug']);
    const recovered = await graphql({ schema, source: '{ categoryBySlug(slug: "category-101") { id } }' });
    expect(recovered.errors).toBeUndefined();
    expect(recovered.data).toEqual({ categoryBySlug: { id: 'category-101' } });
    expect(repository.findAll).not.toHaveBeenCalled();
  });
});
