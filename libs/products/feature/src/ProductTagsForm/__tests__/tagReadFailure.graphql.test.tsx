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
    upsert: vi.fn(async next => (stored = next)),
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
  const view = render(
    <ApolloProvider client={client}>
      <ProductTagsForm slug={product.slug} />
    </ApolloProvider>
  );
  return {
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
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('핀테크, 결제');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
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
