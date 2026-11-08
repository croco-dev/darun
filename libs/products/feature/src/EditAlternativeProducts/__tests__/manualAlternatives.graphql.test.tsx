import 'reflect-metadata';
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { GetProduct, GetPublishedProduct, Product, type ProductRepository } from '@darun/products-domain';
import {
  AlternativeProduct,
  GetAlternativeProducts,
  UpdateAlternativeProduct,
  type AlternativeProductRepository,
} from '@darun/recommendation-domain';
import { AutoRecommender } from '@darun/recommendation-domain/src/services/AutoRecommender';
import { AuthRole, createAuthChecker } from '@darun/utils-apollo-server';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type * as GraphQL from 'graphql';
import { buildSchemaSync } from 'type-graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { ProductQueryResolver } from '../../Product.query.resolver';
import { ProductRecommendationMutationResolver } from '../../ProductRecommendationMutationResolver';
import { EditAlternativeProducts } from '../EditAlternativeProducts';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const { execute, graphql } = createRequire(import.meta.url)('graphql') as typeof GraphQL;
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach(client => client.stop());
  clients.length = 0;
  vi.restoreAllMocks();
});

function setup(initialIds: string[] = []) {
  const products = Array.from({ length: 8 }, (_, index) => {
    const id = index === 0 ? 'source' : `alternative-${index}`;
    return new Product({
      id,
      slug: id,
      name: id,
      summary: '',
      logoUrl: '',
      publishedAt: index === 7 ? undefined : new Date('2026-01-01T00:00:00Z'),
    });
  });
  const source = products[0];
  let storedIds = initialIds;
  let failRead = false;
  const alternativeRepository: AlternativeProductRepository = {
    findManyByProductId: vi.fn(async (productId: string) => {
      if (failRead) throw new Error('manual alternatives unavailable');
      return storedIds.map(alternativeProductId => new AlternativeProduct({ productId, alternativeProductId }));
    }),
    replaceByProductId: vi.fn(async (_productId: string, ids: string[]) => {
      storedIds = [...ids];
    }),
    create: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  };
  const productRepository = {
    findOneBySlug: vi.fn(async () => source),
    findPublishedOneBySlug: vi.fn(async () => source),
    findOneById: vi.fn(async (id: string) => products.find(product => product.id === id) ?? null),
    findPublishedByIds: vi.fn(async (ids: string[]) =>
      ids.map(id => products.find(product => product.id === id && product.publishedAt) ?? null)
    ),
  } as unknown as ProductRepository;
  const recommender = new AutoRecommender(undefined!, undefined!);
  const recommend = vi
    .spyOn(recommender, 'recommend')
    .mockImplementation(async ({ excludeProductIds = [], limit = 5 }) =>
      products
        .slice(1, 7)
        .filter(product => !excludeProductIds.includes(product.id))
        .slice(0, limit)
        .map(product => new AlternativeProduct({ productId: source.id, alternativeProductId: product.id }))
    );
  const getProduct = new GetProduct(productRepository);
  const queryResolver = new ProductQueryResolver(
    undefined!,
    undefined!,
    undefined!,
    getProduct,
    new GetPublishedProduct(productRepository),
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    { execute: async () => [{ id: 'alternative-6' }] } as never,
    new GetAlternativeProducts(alternativeRepository, productRepository, recommender),
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    productRepository
  );
  const mutationResolver = new ProductRecommendationMutationResolver(
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    getProduct,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    new UpdateAlternativeProduct(alternativeRepository)
  );
  const schema = buildSchemaSync({
    resolvers: [ProductQueryResolver, ProductRecommendationMutationResolver],
    container: { get: target => (target === ProductQueryResolver ? queryResolver : mutationResolver) },
    authChecker: createAuthChecker(),
  });
  const contextValue = { getRoles: async () => [AuthRole.Admin] };
  const responses: GraphQL.ExecutionResult[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          void Promise.resolve(
            execute({
              schema,
              document: operation.query,
              variableValues: operation.variables,
              contextValue,
            })
          ).then(
            response => {
              responses.push(response);
              observer.next(response);
              observer.complete();
            },
            error => observer.error(error)
          );
        })
    ),
  });
  clients.push(client);
  const renderForm = () =>
    render(
      <ApolloProvider client={client}>
        <EditAlternativeProducts slug="source" />
      </ApolloProvider>
    );
  let view = renderForm();
  return {
    schema,
    recommend,
    alternativeRepository,
    responses,
    stored: () => storedIds,
    selected: () => [...screen.getByRole<HTMLSelectElement>('listbox').selectedOptions].map(option => option.value),
    save: () => screen.getByRole<HTMLButtonElement>('button', { name: '저장' }),
    submit: () => fireEvent.submit(view.container.querySelector('form')!),
    reopen: async () => {
      view.unmount();
      await client.clearStore();
      view = renderForm();
    },
    failReads: (value: boolean) => {
      failRead = value;
    },
    readPublic: () =>
      graphql({
        schema,
        contextValue: { getRoles: async () => [] },
        source: '{ productBySlug(slug: "source") { alternatives { id } } }',
      }),
  };
}

describe('수동 대안 저장소 → 실제 GraphQL·Apollo → 편집 폼', () => {
  it('수동 0개·자동 5개를 편집 없이 저장해도 자동 추천을 수동으로 고정하지 않는다', async () => {
    const fixture = setup();
    const firstPublic = await fixture.readPublic();
    expect(firstPublic.errors).toBeUndefined();
    expect(firstPublic.data?.productBySlug).toEqual({
      alternatives: Array.from({ length: 5 }, (_, i) => ({ id: `alternative-${i + 1}` })),
    });
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    fixture.submit();
    await waitFor(() => expect(fixture.alternativeRepository.replaceByProductId).toHaveBeenCalled());
    expect(fixture.stored()).toEqual([]);
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.selected()).toEqual([]);
    await fixture.reopen();
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.selected()).toEqual([]);
    await fixture.readPublic();
    expect(fixture.recommend).toHaveBeenCalledTimes(2);
    expect(fixture.responses.every(response => !response.errors)).toBe(true);
  });

  it('수동 2개에서 검색·추가·삭제·저장·재진입해도 수동 선택만 보존한다', async () => {
    const fixture = setup(['alternative-2', 'alternative-4']);
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.selected()).toEqual(['alternative-2', 'alternative-4']);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '6' } });
    await screen.findByRole('option', { name: 'alternative-6' });
    const select = screen.getByRole<HTMLSelectElement>('listbox');
    for (const option of select.options) option.selected = ['alternative-4', 'alternative-6'].includes(option.value);
    fireEvent.change(select);
    fixture.submit();
    await waitFor(() => expect(fixture.stored()).toEqual(['alternative-4', 'alternative-6']));
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.selected()).toEqual(['alternative-4', 'alternative-6']);
    await fixture.reopen();
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.selected()).toEqual(['alternative-4', 'alternative-6']);
    expect(fixture.recommend).not.toHaveBeenCalled();
  });

  it('공개 표시 한도와 미발행 필터를 수동 편집 목록에 적용하지 않는다', async () => {
    const ids = Array.from({ length: 7 }, (_, i) => `alternative-${i + 1}`);
    const fixture = setup(ids);
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.selected()).toEqual(ids);
    fixture.submit();
    await waitFor(() => expect(fixture.alternativeRepository.replaceByProductId).toHaveBeenCalled());
    expect(fixture.stored()).toEqual(ids);
    const result = await fixture.readPublic();
    expect(result.data?.productBySlug).toEqual({ alternatives: ids.slice(0, 5).map(id => ({ id })) });
  });

  it('공개 root의 수동 필드도 비로그인·일반 사용자는 읽을 수 없다', async () => {
    const fixture = setup(['alternative-7']);
    for (const roles of [[], ['User']]) {
      const result = await graphql({
        schema: fixture.schema,
        contextValue: { getRoles: async () => roles },
        source: '{ productBySlug(slug: "source") { manualAlternatives { id } } }',
      });
      expect(result.errors?.[0].path).toEqual(['productBySlug', 'manualAlternatives']);
      expect(result.data?.productBySlug).toBeNull();
    }
  });

  it('수동 조회 실패를 빈 선택 저장으로 바꾸지 않고 같은 폼에서 복구한다', async () => {
    const fixture = setup(['alternative-2']);
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    fixture.failReads(true);
    await fixture.reopen();
    await screen.findByRole('button', { name: '다시 시도' });
    fixture.submit();
    expect(fixture.alternativeRepository.replaceByProductId).not.toHaveBeenCalled();
    expect(fixture.stored()).toEqual(['alternative-2']);
    fixture.failReads(false);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.selected()).toEqual(['alternative-2']);
  });
});
