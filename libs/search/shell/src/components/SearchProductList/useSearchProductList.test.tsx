// @vitest-environment jsdom

import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { Component, StrictMode, Suspense, act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchProductList } from './SearchProductList';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('@darun/analytics-client', () => ({
  AnalyticsEvents: { SEARCH_PERFORMED: 'search_performed' },
  track: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) => key,
}));

vi.mock('@darun/utils-router', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
  useSearchParams: () => new URLSearchParams({ query: 'url-not-the-request' }),
}));

vi.mock('@darun/products-shell', () => ({
  ProductCard: ({ product }: { product: { name: string } }) => <article>{product.name}</article>,
  getCategoryIcon: () => '',
}));

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>failed</p> : this.props.children;
  }
}

const product = (id: number) => ({
  __typename: 'Product',
  id: String(id),
  slug: `product-${id}`,
  name: `Product ${id}`,
  logoUrl: null,
  summary: `Summary ${id}`,
  tags: [],
});

describe('검색 완료 분석', () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: ApolloClient;
  const requests: {
    query: string;
    resolve: (count: number) => void;
    reject: (graphql: boolean) => void;
  }[] = [];

  beforeEach(() => {
    vi.mocked(track).mockClear();
    requests.length = 0;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            if (operation.operationName !== 'SearchProductsOnSearchProductList') {
              observer.next({ data: { categories: [], rankedProducts: [] } });
              observer.complete();
              return;
            }
            requests.push({
              query: operation.variables.query,
              resolve: count => {
                observer.next({
                  data: {
                    searchProducts: Array.from({ length: count }, (_, i) => product(i + 1)),
                  },
                });
                observer.complete();
              },
              reject: graphql => {
                if (graphql) {
                  observer.next({
                    data: { searchProducts: [] },
                    errors: [{ message: 'search unavailable' }],
                  });
                  observer.complete();
                } else observer.error(new Error('network unavailable'));
              },
            });
          })
      ),
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.stop();
    container.remove();
  });

  async function render(query: string) {
    await act(async () => {
      root.render(
        <StrictMode>
          <ApolloProvider client={client}>
            <ErrorBoundary>
              <Suspense fallback={<p>loading</p>}>
                <SearchProductList query={query} />
              </Suspense>
            </ErrorBoundary>
          </ApolloProvider>
        </StrictMode>
      );
    });
  }

  it.each([0, 1, 3])('%i건 정상 완료를 한 번 기록하고 재렌더에서는 중복하지 않는다', async count => {
    await render('  missing  ');
    expect(track).not.toHaveBeenCalled();
    await act(async () => requests[0].resolve(count));
    expect(container.textContent).toContain(count === 0 ? 'list.empty.noResults' : 'list.resultCount');
    expect(track).toHaveBeenCalledExactlyOnceWith(AnalyticsEvents.SEARCH_PERFORMED, {
      query: 'missing',
      resultCount: count,
    });
    await render('  missing  ');
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('빈 검색어가 정상 완료되어도 기록하지 않는다', async () => {
    await render('   ');
    await act(async () => requests[0].resolve(0));
    expect(track).not.toHaveBeenCalled();
  });

  it('캐시의 카드 정보 갱신은 새로운 검색 완료로 기록하지 않는다', async () => {
    await render('first');
    await act(async () => requests[0].resolve(1));
    vi.useFakeTimers();
    try {
      await act(async () => {
        client.cache.modify({
          id: client.cache.identify(product(1)),
          fields: { name: () => 'Renamed product' },
        });
        await vi.runOnlyPendingTimersAsync();
      });
    } finally {
      vi.useRealTimers();
    }
    expect(container.textContent).toContain('Renamed product');
    expect(track).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('조회 실패를 정상 0건으로 기록하지 않는다 (GraphQL: %s)', async graphql => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await render('failure');
      await act(async () => requests[0].reject(graphql));
      expect(container.textContent).toBe('failed');
      expect(track).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('입력만 바뀐 조회와 늦은 이전 응답을 제외하고 현재 검색의 완료를 기록한다', async () => {
    await render('first');
    await render('second');
    expect(requests.map(request => request.query)).toEqual(['first', 'second']);
    expect(track).not.toHaveBeenCalled();
    await act(async () => requests[0].resolve(3));
    expect(track).not.toHaveBeenCalled();
    await act(async () => requests[1].resolve(0));
    expect(track).toHaveBeenCalledExactlyOnceWith('search_performed', {
      query: 'second',
      resultCount: 0,
    });
    await render('third');
    expect(track).toHaveBeenCalledTimes(1);
    await act(async () => requests[2].resolve(1));
    expect(track).toHaveBeenLastCalledWith('search_performed', {
      query: 'third',
      resultCount: 1,
    });
    expect(track).toHaveBeenCalledTimes(2);
    await render('second');
    expect(track).toHaveBeenLastCalledWith('search_performed', {
      query: 'second',
      resultCount: 0,
    });
    expect(track).toHaveBeenCalledTimes(3);
  });
});
