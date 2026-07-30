import 'reflect-metadata';

import { Category, GetCategories, type CategoryRepository } from '@darun/products-domain';
import { buildSchema } from 'type-graphql';
import { Container } from 'typedi';
import { describe, expect, it, vi } from 'vitest';
import { CategoryQueryResolver } from '../Category.query.resolver';

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
    const resolver = new CategoryQueryResolver(new GetCategories(createRepository()));

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
  });
});
