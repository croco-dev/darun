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
      const translationJobService = {
        translateEntity: vi.fn().mockResolvedValue(undefined),
      };

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
      const translationJobService = {
        translateEntity: vi.fn().mockResolvedValue(undefined),
      };
      const resolver = new TranslationMutationResolver(translationJobService as never);

      const result = await resolver.requestTranslation('Magazine', 'mag-1', ['name', 'name', 'summary']);

      expect(translationJobService.translateEntity).toHaveBeenCalledWith('Magazine', 'mag-1', ['name', 'summary']);
      expect(result.fields).toEqual(['name', 'summary']);
    });

    it('ProductFeature entityType 번역 작업을 정상 요청한다', async () => {
      const translationJobService = {
        translateEntity: vi.fn().mockResolvedValue(undefined),
      };

      const resolver = new TranslationMutationResolver(translationJobService as never);
      const result = await resolver.requestTranslation('ProductFeature', 'feat-1', ['name', 'summary']);

      expect(translationJobService.translateEntity).toHaveBeenCalledWith('ProductFeature', 'feat-1', [
        'name',
        'summary',
      ]);
      expect(result.entityType).toBe('ProductFeature');
      expect(result.status).toBe('completed');
    });
  });

  describe('requestProductTranslation', () => {
    it('productId로 상품과 하위 기능 통합 번역을 요청하고 완료 상태를 반환한다', async () => {
      const translationJobService = {
        translateProductWithFeatures: vi.fn().mockResolvedValue('prod-123'),
      };

      const resolver = new TranslationMutationResolver(translationJobService as never);
      const result = await resolver.requestProductTranslation('prod-123');

      expect(translationJobService.translateProductWithFeatures).toHaveBeenCalledWith({ id: 'prod-123' });
      expect(result.entityType).toBe('Product');
      expect(result.entityId).toBe('prod-123');
      expect(result.status).toBe('completed');
      expect(result.message).toContain('완료');
    });

    it('slug로 상품과 하위 기능 통합 번역을 요청하고 완료 상태를 반환한다', async () => {
      const translationJobService = {
        translateProductWithFeatures: vi.fn().mockResolvedValue('prod-123'),
      };

      const resolver = new TranslationMutationResolver(translationJobService as never);
      const result = await resolver.requestProductTranslation(undefined, 'toss');

      expect(translationJobService.translateProductWithFeatures).toHaveBeenCalledWith({ slug: 'toss' });
      expect(result.entityType).toBe('Product');
      expect(result.entityId).toBe('prod-123');
      expect(result.status).toBe('completed');
    });

    it('productId와 slug가 모두 없으면 에러를 던진다', async () => {
      const translationJobService = {
        translateProductWithFeatures: vi.fn(),
      };

      const resolver = new TranslationMutationResolver(translationJobService as never);
      await expect(resolver.requestProductTranslation()).rejects.toThrow('productId 또는 slug가 필요합니다.');
    });
  });
});
