import 'reflect-metadata';

vi.mock('typedi', () => ({
  Service: () => () => {},
}));

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor;
  return {
    Arg: () => () => vi.fn(),
    Authorized: methodDecorator,
    Mutation: methodDecorator,
    ObjectType: () => () => {},
    Field: () => () => {},
    InputType: () => () => {},
    Resolver: () => () => {},
  };
});

import { describe, expect, it, vi } from 'vitest';
import { TranslationMutationResolver } from '../Translation.mutation.resolver';

describe('TranslationMutationResolver', () => {
  describe('requestTranslation', () => {
    it('번역 작업을 요청하고 완료 상태를 반환한다', async () => {
      const translationJobService = { translateEntity: vi.fn().mockResolvedValue(undefined) };

      const resolver = new TranslationMutationResolver(translationJobService as never);
      const result = await resolver.requestTranslation('Product', 'prod-1', ['name', 'summary']);

      expect(translationJobService.translateEntity).toHaveBeenCalledWith('Product', 'prod-1', ['name', 'summary']);
      expect(result.status).toBe('completed');
      expect(result.entityType).toBe('Product');
      expect(result.entityId).toBe('prod-1');
    });

    it('지원하지 않는 entityType이면 에러를 던진다', async () => {
      const translationJobService = { translateEntity: vi.fn() };
      const resolver = new TranslationMutationResolver(translationJobService as never);

      await expect(resolver.requestTranslation('InvalidType', 'prod-1', ['name'])).rejects.toThrow();
    });

    it('fields가 비어있으면 에러를 던진다', async () => {
      const translationJobService = { translateEntity: vi.fn() };
      const resolver = new TranslationMutationResolver(translationJobService as never);

      await expect(resolver.requestTranslation('Product', 'prod-1', [])).rejects.toThrow();
    });

    it('중복 field를 제거하고 처리한다', async () => {
      const translationJobService = { translateEntity: vi.fn().mockResolvedValue(undefined) };
      const resolver = new TranslationMutationResolver(translationJobService as never);

      const result = await resolver.requestTranslation('Magazine', 'mag-1', ['name', 'name', 'summary']);

      expect(translationJobService.translateEntity).toHaveBeenCalledWith('Magazine', 'mag-1', ['name', 'summary']);
      expect(result.fields).toEqual(['name', 'summary']);
    });
  });
});
