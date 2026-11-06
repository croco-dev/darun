import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider, useQuery } from '@apollo/client/react';
import {
  AllProductsOnProductListTableDocument,
  type AllProductsOnProductListTableQuery,
  type AllProductsOnProductListTableQueryVariables,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductListRefreshButton } from '../useProductListRefreshButton';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

function productList(name: string): AllProductsOnProductListTableQuery {
  return {
    allProducts: {
      totalCount: 120,
      edges: [
        {
          cursor: 'cursor-51',
          node: {
            id: 'product-51',
            name,
            slug: 'sample',
            summary: '',
            logoUrl: '',
          },
        },
      ],
      pageInfo: {
        startCursor: 'cursor-51',
        endCursor: 'cursor-100',
        hasPreviousPage: true,
        hasNextPage: true,
      },
    },
  };
}

function setup(variables: AllProductsOnProductListTableQueryVariables, secondPage = false) {
  const requests: {
    variables: AllProductsOnProductListTableQueryVariables;
    succeed: (name: string) => void;
    fail: (kind: 'network' | 'graphql') => void;
  }[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          requests.push({
            variables: { ...operation.variables },
            succeed: name => {
              observer.next({ data: productList(name) });
              observer.complete();
            },
            fail: kind => {
              if (kind === 'network') observer.error(new Error('목록 연결 실패'));
              else {
                observer.next({ errors: [{ message: '목록 조회 실패' }] });
                observer.complete();
              }
            },
          });
        })
    ),
  });
  const wrapper = ({ children }: PropsWithChildren) => <ApolloProvider client={client}>{children}</ApolloProvider>;
  const hook = renderHook(
    () => ({
      ...useProductListRefreshButton(),
      list: useQuery(AllProductsOnProductListTableDocument, { variables }),
    }),
    { wrapper }
  );
  const other = secondPage
    ? renderHook(
        () =>
          useQuery(AllProductsOnProductListTableDocument, {
            variables: { first: 50 },
          }),
        { wrapper }
      )
    : undefined;
  return { ...hook, requests, client, other };
}

async function flush(action: () => void) {
  await act(async () => {
    action();
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('product list refresh through real Apollo client and link', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each([
    { first: 50, after: 'cursor-50' },
    { last: 50, before: 'cursor-101' },
  ])('refetches the current page once with %j and waits for updated rows before success', async variables => {
    const { result, requests, client } = setup(variables);
    await flush(() => requests[0].succeed('기존 서비스'));
    expect(result.current.list.data?.allProducts.edges[0].node.name).toBe('기존 서비스');
    let pending!: Promise<void>;
    await flush(() => {
      pending = result.current.refresh();
    });
    expect(requests.map(request => request.variables)).toEqual([variables, variables]);
    expect(result.current.isRefreshing).toBe(true);
    expect(notifications.show).not.toHaveBeenCalled();
    await flush(() => {
      void result.current.refresh();
    });
    expect(requests).toHaveLength(2);
    await act(async () => {
      requests[1].succeed('갱신된 서비스');
      await pending;
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.list.data?.allProducts.edges[0].node.name).toBe('갱신된 서비스');
    expect(result.current.isRefreshing).toBe(false);
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith({
      message: '서비스 목록을 새로 불러왔어요.',
      color: 'teal',
    });
    client.stop();
  });

  it.each(['network', 'graphql'] as const)('reports %s failure without success and allows retry', async kind => {
    const variables = { first: 50, after: 'cursor-50' };
    const { result, requests, client } = setup(variables);
    await flush(() => requests[0].succeed('기존 서비스'));
    let pending!: Promise<void>;
    await flush(() => {
      pending = result.current.refresh();
    });
    expect(requests).toHaveLength(2);
    expect(result.current.isRefreshing).toBe(true);
    expect(notifications.show).not.toHaveBeenCalled();
    await act(async () => {
      requests[1].fail(kind);
      await pending;
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.isRefreshing).toBe(false);
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith({
      title: '새로고침 실패',
      message: kind === 'network' ? '목록 연결 실패' : '목록 조회 실패',
      color: 'red',
    });
    await flush(() => {
      pending = result.current.refresh();
    });
    expect(requests).toHaveLength(3);
    expect(requests[2].variables).toEqual(variables);
    await act(async () => {
      requests[2].succeed('복구된 서비스');
      await pending;
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.list.data?.allProducts.edges[0].node.name).toBe('복구된 서비스');
    expect(result.current.isRefreshing).toBe(false);
    expect(notifications.show).toHaveBeenCalledTimes(2);
    expect(notifications.show).toHaveBeenLastCalledWith({
      message: '서비스 목록을 새로 불러왔어요.',
      color: 'teal',
    });
    client.stop();
  });

  it('waits for all matching active queries and emits only one success notice', async () => {
    const { result, requests, client, other } = setup({ first: 50, after: 'cursor-50' }, true);
    await flush(() => {
      requests[0].succeed('현재 페이지');
      requests[1].succeed('다른 페이지');
    });
    let pending!: Promise<void>;
    await flush(() => {
      pending = result.current.refresh();
    });
    expect(requests).toHaveLength(4);
    await flush(() => requests[2].succeed('현재 페이지 갱신'));
    expect(result.current.isRefreshing).toBe(true);
    expect(notifications.show).not.toHaveBeenCalled();
    await act(async () => {
      requests[3].succeed('다른 페이지 갱신');
      await pending;
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.list.data?.allProducts.edges[0].node.name).toBe('현재 페이지 갱신');
    expect(other?.result.current.data?.allProducts.edges[0].node.name).toBe('다른 페이지 갱신');
    expect(result.current.isRefreshing).toBe(false);
    expect(notifications.show).toHaveBeenCalledTimes(1);
    client.stop();
  });
});
