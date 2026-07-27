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
    Mutation: methodDecorator,
    ObjectType: () => () => {},
    Field: () => () => {},
    InputType: () => () => {},
    Resolver: () => () => {},
    ID: class ID {},
    Int: class Int {},
  };
});

import { Magazine } from '@darun/magazines-domain';
import { describe, expect, it, vi } from 'vitest';
import { MagazineMutationResolver } from '../Magazine.mutation.resolver';

function createTestMagazine(overrides: Partial<ConstructorParameters<typeof Magazine>[0]> = {}) {
  return new Magazine({
    id: 'mag-1',
    title: '테스트',
    backgroundImageUrl: 'https://example.com/bg.png',
    authorId: 'author-1',
    ...overrides,
  });
}

function createResolver() {
  const createMagazine = { execute: vi.fn() };
  const getMagazine = { execute: vi.fn() };
  const publishMagazine = { execute: vi.fn() };
  const editMagazine = { execute: vi.fn() };

  const resolver = new MagazineMutationResolver(
    createMagazine as never,
    getMagazine as never,
    publishMagazine as never,
    editMagazine as never
  );

  return { resolver, createMagazine, getMagazine, publishMagazine, editMagazine };
}

describe('MagazineMutationResolver', () => {
  describe('createMagazine', () => {
    it('매거진을 생성하고 반환한다', async () => {
      const { resolver, createMagazine } = createResolver();
      const magazine = createTestMagazine();
      createMagazine.execute.mockResolvedValue(magazine);

      const context = { getUserIdOrThrow: vi.fn().mockResolvedValue('user-1') };
      const result = await resolver.createMagazine(
        { title: '테스트', backgroundImageUrl: 'https://example.com/bg.png' } as never,
        context as never
      );

      expect(context.getUserIdOrThrow).toHaveBeenCalled();
      expect(createMagazine.execute).toHaveBeenCalledWith(expect.objectContaining({ authorId: 'user-1' }));
      expect(result).toEqual({ magazine });
    });
  });

  describe('publishMagazine', () => {
    it('매거진이 없으면 에러를 던진다', async () => {
      const { resolver, getMagazine } = createResolver();
      getMagazine.execute.mockResolvedValue(null);

      await expect(resolver.publishMagazine({ slug: 'test' })).rejects.toThrow();
    });

    it('매거진을 발행하고 반환한다', async () => {
      const { resolver, getMagazine, publishMagazine } = createResolver();
      const magazine = createTestMagazine();
      const publishedMagazine = createTestMagazine({ publishedAt: new Date() });
      getMagazine.execute.mockResolvedValue(magazine);
      publishMagazine.execute.mockResolvedValue(publishedMagazine);

      const result = await resolver.publishMagazine({ slug: 'test' });

      expect(publishMagazine.execute).toHaveBeenCalledWith({ id: 'mag-1' });
      expect(result).toEqual({ magazine: publishedMagazine });
    });
  });

  describe('editMagazine', () => {
    it('매거진이 없으면 에러를 던진다', async () => {
      const { resolver, getMagazine } = createResolver();
      getMagazine.execute.mockResolvedValue(null);

      await expect(resolver.editMagazine('test', { title: '새 제목' } as never)).rejects.toThrow();
    });

    it('매거진을 수정하고 반환한다', async () => {
      const { resolver, getMagazine, editMagazine } = createResolver();
      const magazine = createTestMagazine();
      const updated = createTestMagazine({ title: '수정된 제목' });
      getMagazine.execute.mockResolvedValue(magazine);
      editMagazine.execute.mockResolvedValue(updated);

      const result = await resolver.editMagazine('test', { title: '수정된 제목' } as never);

      expect(editMagazine.execute).toHaveBeenCalledWith(expect.objectContaining({ id: 'mag-1', title: '수정된 제목' }));
      expect(result).toEqual({ magazine: updated });
    });
  });
});
