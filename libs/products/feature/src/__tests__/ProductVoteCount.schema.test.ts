// @vitest-environment node
import 'reflect-metadata';
import { ApolloClient, ApolloLink, InMemoryCache, Observable, gql } from '@apollo/client';
import { Product } from '@darun/products-domain';
import type * as GraphQL from 'graphql';
import { buildSchemaSync } from 'type-graphql';
import { afterEach, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { ProductQueryResolver } from '../Product.query.resolver';

const { execute } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;

afterEach(() => vi.restoreAllMocks());

it('추천 수 42 → 조회 실패 → 재조회 43과 실제 0을 GraphQL과 Apollo에서 구분한다', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const product = new Product({
    id: 'p1',
    slug: 'notion',
    name: 'Notion',
    summary: '',
    logoUrl: '',
  });
  const count = vi
    .fn()
    .mockResolvedValueOnce(42)
    .mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValueOnce(43)
    .mockResolvedValueOnce(0);
  const unused = undefined!;
  const resolver = new ProductQueryResolver(
    { execute: vi.fn().mockResolvedValue([product]) } as never,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    { execute: count } as never,
    unused,
    unused,
    unused,
    unused
  );
  const schema = buildSchemaSync({
    resolvers: [ProductQueryResolver],
    authChecker: () => true,
    container: { get: () => resolver },
  });
  const cache = new InMemoryCache();
  const client = new ApolloClient({
    cache,
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          Promise.resolve(
            execute({
              schema,
              document: operation.query,
              variableValues: operation.variables,
            })
          )
            .then(result => {
              observer.next(result);
              observer.complete();
            })
            .catch(error => observer.error(error));
        })
    ),
  });
  const query = gql`
    query VoteCountContract {
      recentProducts(first: 1) {
        id
        name
        voteCount
      }
    }
  `;
  const read = () => client.query({ query, fetchPolicy: 'network-only' });
  try {
    expect((await read()).data).toMatchObject({
      recentProducts: [{ name: 'Notion', voteCount: 42 }],
    });
    expect((await read()).data).toMatchObject({
      recentProducts: [{ name: 'Notion', voteCount: null }],
    });
    expect(cache.extract()['Product:p1']).toMatchObject({
      voteCount: null,
    });
    expect((await read()).data).toMatchObject({
      recentProducts: [{ voteCount: 43 }],
    });
    expect((await read()).data).toMatchObject({
      recentProducts: [{ voteCount: 0 }],
    });
  } finally {
    client.stop();
  }
});
