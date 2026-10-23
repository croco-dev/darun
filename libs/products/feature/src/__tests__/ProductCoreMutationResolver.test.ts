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
    Resolver: () => () => {},
    Root: () => () => {},
  };
});

import { Product } from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { ProductCoreMutationResolver } from '../ProductCoreMutationResolver';

describe('ProductCoreMutationResolver', () => {
  it('발행 편집은 canonical write 결과를 반환한다', async () => {
    const product = new Product({
      id: 'p1',
      slug: 'memo',
      name: '메모',
      summary: '이전',
      logoUrl: 'logo',
      publishedAt: new Date(),
    });
    const updated = new Product({ ...product, summary: '새 요약' });
    const edit = { execute: vi.fn().mockResolvedValue(updated) };
    const resolver = new ProductCoreMutationResolver(
      {} as never,
      edit as never,
      {} as never,
      { execute: vi.fn().mockResolvedValue(product) } as never,
      {} as never
    );
    await expect(resolver.editProduct('memo', { summary: '새 요약' })).resolves.toEqual({ product: updated });
    expect(edit.execute).toHaveBeenCalledWith({ id: 'p1', summary: '새 요약' });
  });

  it('미존재 Product와 canonical commit 실패를 숨기지 않는다', async () => {
    const get = { execute: vi.fn().mockResolvedValue(null) };
    const edit = { execute: vi.fn().mockRejectedValue(new Error('intent transaction failed')) };
    const resolver = new ProductCoreMutationResolver(
      {} as never,
      edit as never,
      {} as never,
      get as never,
      {} as never
    );
    await expect(resolver.editProduct('missing', { name: '새 이름' })).rejects.toThrow();
    expect(edit.execute).not.toHaveBeenCalled();
    get.execute.mockResolvedValue({ id: 'p1' });
    await expect(resolver.editProduct('memo', { name: '새 이름' })).rejects.toThrow('intent transaction failed');
  });
});
