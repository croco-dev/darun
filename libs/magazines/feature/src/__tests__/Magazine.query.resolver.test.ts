import 'reflect-metadata';

vi.mock('typedi', () => ({
  Inject: () => () => {},
  Service: () => () => {},
  Token: class Token {},
}));

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor;
  return {
    Arg: () => () => vi.fn(),
    Authorized: methodDecorator,
    Ctx: () => () => vi.fn(),
    FieldResolver: methodDecorator,
    Mutation: methodDecorator,
    ObjectType: () => () => {},
    Field: () => () => {},
    InputType: () => () => {},
    Query: methodDecorator,
    Resolver: () => () => {},
    Root: () => () => vi.fn(),
    ID: class ID {},
    Int: class Int {},
  };
});

import { Magazine } from '@darun/magazines-domain';
import { describe, expect, it, vi } from 'vitest';
import { MagazineQueryResolver } from '../Magazine.query.resolver';

function createTestMagazine(overrides: Partial<ConstructorParameters<typeof Magazine>[0]> = {}) {
  return new Magazine({
    id: 'mag-1',
    slug: 'slug-1',
    title: '테스트 매거진',
    backgroundImageUrl: 'https://example.com/bg.png',
    authorId: 'author-1',
    publishedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });
}

function createResolver() {
  const getPublishedMagazine = { execute: vi.fn() };
  const getMagazine = { execute: vi.fn() };
  const getProfile = { execute: vi.fn() };
  const getMagazineList = { execute: vi.fn() };
  const getPublishedMagazineList = { execute: vi.fn() };

  const resolver = new MagazineQueryResolver(
    getPublishedMagazine as never,
    getMagazine as never,
    getProfile as never,
    getMagazineList as never,
    getPublishedMagazineList as never
  );

  return {
    resolver,
    getPublishedMagazine,
    getMagazine,
    getProfile,
    getMagazineList,
    getPublishedMagazineList,
  };
}

describe('MagazineQueryResolver', () => {
  describe('publishedMagazines', () => {
    it('발행된 모든 매거진 목록을 반환한다', async () => {
      const { resolver, getPublishedMagazineList } = createResolver();
      const magazines = [
        createTestMagazine({ id: 'mag-1', slug: 'first' }),
        createTestMagazine({ id: 'mag-2', slug: 'second' }),
      ];
      getPublishedMagazineList.execute.mockResolvedValue(magazines);

      const result = await resolver.publishedMagazines();

      expect(getPublishedMagazineList.execute).toHaveBeenCalled();
      expect(result).toEqual(magazines);
    });
  });

  describe('magazineBySlug', () => {
    it('슬러그로 발행된 매거진을 조회한다', async () => {
      const { resolver, getPublishedMagazine } = createResolver();
      const magazine = createTestMagazine({ slug: 'test-slug' });
      getPublishedMagazine.execute.mockResolvedValue(magazine);

      const result = await resolver.magazineBySlug('test-slug');

      expect(getPublishedMagazine.execute).toHaveBeenCalledWith({ slug: 'test-slug' });
      expect(result).toEqual(magazine);
    });
  });
});
