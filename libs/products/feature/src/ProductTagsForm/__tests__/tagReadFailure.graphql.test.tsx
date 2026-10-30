import 'reflect-metadata';
import { ApolloClient, ApolloLink, InMemoryCache, Observable, type Operation } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import {
  GetProduct,
  GetProductTags,
  GetPublishedProduct,
  Product,
  ProductTag,
  Tag,
  UpdateProductTag,
  type ProductRepository,
  type ProductTagRepository,
} from '@darun/products-domain';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type * as GraphQL from 'graphql';
import { buildSchemaSync } from 'type-graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { ProductQueryResolver } from '../../Product.query.resolver';
import { ProductTagsForm } from '../ProductTagsForm';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

// TypeGraphQL creates its schema with the CommonJS GraphQL instance.
const { execute, graphql } = createRequire(import.meta.url)('graphql') as typeof GraphQL;
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach(client => client.stop());
  clients.length = 0;
});

function setup(initialTags = ['핀테크', '결제'], failRead = false) {
  const product = new Product({
    id: 'product-a',
    name: '제품',
    slug: 'fixture-a',
    summary: '',
    logoUrl: '',
  });
  let failWrite = false;
  let stored = new ProductTag({
    productId: product.id,
    tags: initialTags.map((name, index) => new Tag({ id: `tag-${index}`, name })),
  });
  const repository: ProductTagRepository = {
    findOneByProductId: vi.fn(async () => {
      if (failRead) throw new Error('tag storage unavailable');
      return stored.tags.length ? stored : null;
    }),
    findByProductIds: vi.fn(),
    upsert: vi.fn(async (next: ProductTag) => {
      stored = new ProductTag({
        productId: next.productId,
        tags: next.tags.map((tag, index) => new Tag({ id: `saved-tag-${index}`, name: tag.name })),
      });
      return stored;
    }),
  };
  const products = {
    findOneBySlug: vi.fn(async () => product),
    findPublishedOneBySlug: vi.fn(async () => product),
  } as unknown as ProductRepository;
  const resolver = new ProductQueryResolver(
    undefined!,
    undefined!,
    undefined!,
    new GetProduct(products),
    new GetPublishedProduct(products),
    undefined!,
    new GetProductTags(repository),
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    undefined!,
    products
  );
  const schema = buildSchemaSync({
    resolvers: [ProductQueryResolver],
    container: { get: () => resolver },
    authChecker: () => true,
  });
  const responses: GraphQL.ExecutionResult[] = [];
  const writes: Operation[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const run = async () => {
            if (operation.operationName === 'UpdateProductTagsOnProductTagForm') {
              writes.push(operation);
              if (failWrite) {
                failWrite = false;
                throw new Error('fixture save failed');
              }
              await new UpdateProductTag(repository).execute({
                productId: product.id,
                tagNames: operation.variables.input.tagNames,
              });
              return {
                data: {
                  updateProductTags: {
                    product: { id: product.id, tags: stored.tags },
                  },
                },
              };
            }
            const response = await execute({
              schema,
              document: operation.query,
              variableValues: operation.variables,
            });
            responses.push(response);
            return response;
          };
          void run().then(
            response => {
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
        <ProductTagsForm slug={product.slug} />
      </ApolloProvider>
    );
  let view = renderForm();
  return {
    failNextSave: () => {
      failWrite = true;
    },
    reopen: async () => {
      view.unmount();
      await client.clearStore();
      view = renderForm();
    },
    schema,
    responses,
    writes,
    repository,
    client,
    stored: () => stored.tags.map(tag => tag.name),
    recover: () => {
      failRead = false;
    },
    submit: () => fireEvent.submit(view.container.querySelector('form')!),
    save: () => screen.getByRole<HTMLButtonElement>('button', { name: '저장' }),
  };
}

describe('태그 저장소 실패 → GraphQL → 실제 편집 폼', () => {
  it('쉼표와 특수 문자가 있는 태그를 편집 없이 저장해도 원래 이름을 보존한다', async () => {
    const names = ['Research, Development', 'Workflow', 'C++ (도구)'];
    const fixture = setup(names);
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    fixture.submit();
    await waitFor(() => expect(fixture.writes).toHaveLength(1));
    expect(fixture.writes[0].variables.input).toEqual({ tagNames: names });
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.stored()).toEqual(names);
    await fixture.reopen();
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(screen.getAllByRole<HTMLInputElement>('textbox').map(input => input.value)).toEqual(names);
  });

  it('다른 태그의 추가·수정·제거와 저장 실패 후 재시도에서도 쉼표 이름을 보존한다', async () => {
    const fixture = setup(['Research, Development', 'Workflow', '제거할 태그']);
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: '제거할 태그 제거' }));
    fireEvent.change(screen.getByRole('textbox', { name: '태그 2' }), {
      target: { value: '도구, 자동화' },
    });
    fireEvent.click(screen.getByRole('button', { name: '태그 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '태그 3' }), {
      target: { value: '단순 태그' },
    });
    fireEvent.click(screen.getByRole('button', { name: '태그 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '태그 4' }), {
      target: { value: ' Research, Development ' },
    });
    const expected = ['Research, Development', '도구, 자동화', '단순 태그'];
    fixture.failNextSave();
    fixture.submit();
    await waitFor(() => expect(fixture.writes).toHaveLength(1));
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(screen.getAllByRole<HTMLInputElement>('textbox').map(input => input.value)).toEqual([
      ...expected,
      ' Research, Development ',
    ]);
    expect(fixture.stored()).toEqual(['Research, Development', 'Workflow', '제거할 태그']);
    fixture.submit();
    await waitFor(() => expect(fixture.writes).toHaveLength(2));
    expect(fixture.writes[1].variables.input).toEqual({ tagNames: expected });
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    await fixture.reopen();
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(screen.getAllByRole<HTMLInputElement>('textbox').map(input => input.value)).toEqual(expected);
  });

  it('실패를 빈 태그로 저장하지 않으며 재시도 후에만 의도한 전체 삭제를 저장한다', async () => {
    const fixture = setup(undefined, true);
    await waitFor(() => expect(fixture.responses).toHaveLength(1));
    expect(fixture.responses[0].errors?.[0].path).toEqual(['tempProductBySlug', 'tags']);
    expect(fixture.responses[0].data?.tempProductBySlug).toBeNull();
    await screen.findByRole('button', { name: '다시 시도' });
    fixture.submit();
    expect(fixture.save().disabled).toBe(true);
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.repository.upsert).not.toHaveBeenCalled();
    expect(fixture.stored()).toEqual(['핀테크', '결제']);
    expect(JSON.stringify(fixture.client.cache.extract())).not.toContain('"tags":[]');

    fixture.recover();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(screen.getAllByRole<HTMLInputElement>('textbox').map(input => input.value)).toEqual(['핀테크', '결제']);
    fireEvent.click(screen.getByRole('button', { name: '핀테크 제거' }));
    fireEvent.click(screen.getByRole('button', { name: '결제 제거' }));
    fixture.submit();
    await waitFor(() => expect(fixture.writes).toHaveLength(1));
    expect(fixture.writes[0].variables.input).toEqual({ tagNames: [] });
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.stored()).toEqual([]);
  });

  it('정상적으로 조회한 빈 태그는 편집하고 저장할 수 있다', async () => {
    const fixture = setup([]);
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.responses[0].errors).toBeUndefined();
    expect(fixture.responses[0].data?.tempProductBySlug).toMatchObject({
      tags: [],
    });
    fixture.submit();
    await waitFor(() => expect(fixture.writes).toHaveLength(1));
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    expect(fixture.stored()).toEqual([]);
  });

  it('공개 태그 조회도 오류를 전달하며 태그를 선택하지 않은 상품 조회는 유지한다', async () => {
    const fixture = setup(undefined, true);
    await screen.findByRole('button', { name: '다시 시도' });
    const response = await graphql({
      schema: fixture.schema,
      source:
        '{ failed: productBySlug(slug: "fixture-a") { id tags { name } } basic: productBySlug(slug: "fixture-a") { id name } }',
    });
    expect(response.errors?.map(error => error.path)).toEqual([['failed', 'tags']]);
    expect(response.data).toEqual({
      failed: null,
      basic: { id: 'product-a', name: '제품' },
    });
  });
});
