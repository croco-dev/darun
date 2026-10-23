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
  it.each(['Product', 'Magazine', 'ProductFeature'])(
    'requestTranslation %s는 동일 공개 인자로 pending job과 fields를 반환한다',
    async entityType => {
      const fields = entityType === 'Magazine' ? ['title', 'summary'] : ['name', 'summary'];
      const service = {
        requestTranslationJob: vi.fn().mockResolvedValue({
          id: 'durable-job',
          entityType,
          entityId: 'source-1',
          fields,
          locale: 'en',
          status: 'pending',
        }),
      };
      const result = await new TranslationMutationResolver(service as never).requestTranslation(
        entityType,
        'source-1',
        [...fields, fields[0]!]
      );
      expect(service.requestTranslationJob).toHaveBeenCalledWith(entityType, 'source-1', fields);
      expect(result).toMatchObject({ id: 'durable-job', status: 'pending', fields });
    }
  );
  it('미지원 entityType 또는 빈 fields는 job을 등록하지 않는다', async () => {
    const service = { requestTranslationJob: vi.fn() };
    const resolver = new TranslationMutationResolver(service as never);
    await expect(resolver.requestTranslation('Invalid', 'source', ['name'])).rejects.toThrow();
    await expect(resolver.requestTranslation('Product', 'source', [])).rejects.toThrow();
    expect(service.requestTranslationJob).not.toHaveBeenCalled();
  });
  it('requestProductTranslation은 ID/slug를 보존하고 동기 LLM fallback을 하지 않는다', async () => {
    const service = {
      requestProductTranslationJob: vi.fn().mockResolvedValue({ id: 'durable-job', entityId: 'p1', status: 'pending' }),
    };
    const resolver = new TranslationMutationResolver(service as never);
    expect((await resolver.requestProductTranslation('p1')).status).toBe('pending');
    expect(service.requestProductTranslationJob).toHaveBeenLastCalledWith({ id: 'p1' });
    await resolver.requestProductTranslation(undefined, 'source-slug');
    expect(service.requestProductTranslationJob).toHaveBeenLastCalledWith({ slug: 'source-slug' });
    await expect(resolver.requestProductTranslation()).rejects.toThrow();
  });
  it('retry는 Magazine의 원래 fields를 응답한다', async () => {
    const service = {
      retryProductTranslationJob: vi.fn().mockResolvedValue({
        id: 'job',
        entityType: 'Magazine',
        entityId: 'm1',
        fields: ['content'],
        locale: 'en',
        status: 'pending',
      }),
    };
    const result = await new TranslationMutationResolver(service as never).retryTranslationJob('job');
    expect(result.fields).toEqual(['content']);
    expect(result.status).toBe('pending');
  });
});
