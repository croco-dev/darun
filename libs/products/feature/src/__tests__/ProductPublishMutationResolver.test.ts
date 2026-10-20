import 'reflect-metadata';

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
  Connection: class Connection {},
  ConnectionArgs: class ConnectionArgs {},
  Cursor: class Cursor {},
  PageInfo: class PageInfo {},
}));

vi.mock('typedi', () => ({
  Inject: () => () => {},
  Service: () => () => {},
  Token: class Token {},
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor;
  return {
    Arg: () => () => vi.fn(),
    Args: () => methodDecorator,
    ArgsType: () => () => {},
    Authorized: methodDecorator,
    Field: () => () => {},
    FieldResolver: methodDecorator,
    GraphQLISODateTime: class GraphQLISODateTime {},
    ID: class ID {},
    InputType: () => () => {},
    Int: class Int {},
    Mutation: methodDecorator,
    ObjectType: () => () => {},
    Query: methodDecorator,
    registerEnumType: () => {},
    Resolver: () => () => {},
    Root: () => () => {},
  };
});

import { Product } from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { ProductPublishMutationResolver } from '../ProductPublishMutationResolver';

function fixture() {
  const product = new Product({ id: 'p1', slug: 'memo', name: '메모', summary: '요약', logoUrl: 'logo' });
  const get = { execute: vi.fn().mockResolvedValue(product) };
  const publish = { execute: vi.fn().mockResolvedValue(new Product({ ...product, publishedAt: new Date() })) };
  const apply = { execute: vi.fn() };
  const resolver = new ProductPublishMutationResolver(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    get as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    publish as never,
    apply as never
  );
  return { resolver, product, get, publish, apply };
}

describe('ProductPublishMutationResolver', () => {
  it('발행은 canonical commit 결과를 반환한다', async () => {
    const { resolver, publish } = fixture();
    const result = await resolver.publishProduct({ slug: 'memo' });
    expect(result.product.publishedAt).toBeInstanceOf(Date);
    expect(publish.execute).toHaveBeenCalledWith({ id: 'p1' });
  });

  it('canonical transaction 실패와 미존재 Product는 성공으로 반환하지 않는다', async () => {
    const { resolver, get, publish } = fixture();
    publish.execute.mockRejectedValue(new Error('intent write failed'));
    await expect(resolver.publishProduct({ slug: 'memo' })).rejects.toThrow('intent write failed');
    get.execute.mockResolvedValue(null);
    await expect(resolver.publishProduct({ slug: 'missing' })).rejects.toThrow();
  });

  it('Apply의 이미 적용한 이력과 후보 marker를 그대로 반환한다', async () => {
    const { resolver, product, apply } = fixture();
    const job = {
      id: 'candidate',
      productId: product.id,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    apply.execute.mockResolvedValue({ product, job, alreadyApplied: true });
    await expect(resolver.applyProductDescriptionCandidate('candidate')).resolves.toMatchObject({
      product,
      alreadyApplied: true,
      job: { id: 'candidate' },
    });
    expect(apply.execute).toHaveBeenCalledWith({ jobId: 'candidate' });
  });

  it('stale candidate를 명확한 GraphQL 오류로 전달한다', async () => {
    const { resolver, apply } = fixture();
    apply.execute.mockRejectedValue(
      Object.assign(new Error('사람 편집 뒤 후보가 만료되었습니다.'), { code: 'STALE_CANDIDATE' })
    );
    await expect(resolver.applyProductDescriptionCandidate('candidate')).rejects.toMatchObject({
      extensions: { code: 'STALE_CANDIDATE' },
    });
  });
});
