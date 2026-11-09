import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { Component, Suspense, act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchProductList } from './SearchProductList';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('@darun/analytics-client', () => ({
  AnalyticsEvents: {},
  track: vi.fn(),
}));
vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) => key,
}));
vi.mock('@darun/utils-router', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@darun/products-shell', () => ({
  ProductCard: ({ product }: { product: { name: string } }) => <article>{product.name}</article>,
  getCategoryIcon: () => '',
}));

class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>route failure</p> : this.props.children;
  }
}

const search = 'SearchProductsOnSearchProductList';
const categories = 'CompactCategoriesForSearchProductList';
const trending = 'CompactTrendingPreviewForSearchProductList';
const product = {
  __typename: 'Product',
  id: 'p1',
  slug: 'orbit',
  name: 'Orbit',
  logoUrl: null,
  summary: 'Work',
  tags: [],
};
const responses = {
  [categories]: {
    categories: [
      {
        __typename: 'Category',
        id: 'c1',
        slug: 'design',
        labelKo: '디자인',
        labelEn: 'Design',
      },
    ],
  },
  [trending]: { rankedProducts: [{ ...product, voteCount: 7 }] },
};

describe('정상 0건 검색의 보조 조회 복구', () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: ApolloClient;
  const requests: {
    name: string;
    resolve: (data: Record<string, unknown>) => void;
    reject: (graphql: boolean) => void;
  }[] = [];

  beforeEach(() => {
    requests.length = 0;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            requests.push({
              name: operation.operationName ?? '',
              resolve: data => {
                observer.next({ data });
                observer.complete();
              },
              reject: graphql => {
                if (graphql) {
                  observer.next({
                    errors: [{ message: 'private upstream failure' }],
                  });
                  observer.complete();
                } else observer.error(new Error('private network failure'));
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

  async function render(count = 0) {
    await act(async () =>
      root.render(
        <ApolloProvider client={client}>
          <RouteBoundary>
            <Suspense fallback={<p>main loading</p>}>
              <SearchProductList query="missing" />
            </Suspense>
          </RouteBoundary>
        </ApolloProvider>
      )
    );
    await act(async () => requests[0].resolve({ searchProducts: count ? [product] : [] }));
  }

  function expectStaticResults() {
    expect(container.textContent).toContain('list.empty.noResults');
    expect(container.querySelector('[data-testid="search-empty-popular-queries"] a')).not.toBeNull();
    expect(container.textContent).not.toContain('route failure');
  }

  it.each([categories, trending] as const)(
    'starts both requests and renders the healthy region while %s is delayed',
    async delayed => {
      await render();
      expectStaticResults();
      expect(requests.map(request => request.name)).toEqual([search, categories, trending]);
      const healthy = delayed === categories ? trending : categories;
      await act(async () => requests.find(request => request.name === healthy)!.resolve(responses[healthy]));
      expect(container.textContent).toContain(healthy === categories ? '디자인' : 'Orbit');
      expect(container.querySelector('[role="status"]')?.textContent).toContain('list.empty.loading');
      await act(async () => requests.find(request => request.name === delayed)!.resolve(responses[delayed]));
      expectStaticResults();
      expect(container.textContent).toContain('디자인');
      expect(container.textContent).toContain('Orbit');
    }
  );

  it.each([
    [categories, false],
    [categories, true],
    [trending, false],
    [trending, true],
  ] as const)('retries only %s after failure (GraphQL: %s)', async (failed, graphql) => {
    await render();
    const healthy = failed === categories ? trending : categories;
    // This assertion also catches the old suspense waterfall before trying to settle a missing request.
    expect(requests.map(request => request.name)).toEqual([search, categories, trending]);
    await act(async () => {
      requests.find(request => request.name === healthy)!.resolve(responses[healthy]);
      requests.find(request => request.name === failed)!.reject(graphql);
    });
    expectStaticResults();
    expect(container.textContent).toContain(healthy === categories ? '디자인' : 'Orbit');
    expect(container.textContent).not.toContain('private');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    const retry = container.querySelector<HTMLButtonElement>('button')!;
    expect(retry?.textContent).toContain('list.empty.retry');
    await act(async () => retry.click());
    expect(requests.map(request => request.name)).toEqual([search, categories, trending, failed]);
    expectStaticResults();
    expect(container.textContent).toContain(healthy === categories ? '디자인' : 'Orbit');
    await act(async () => requests[3].reject(graphql));
    expectStaticResults();
    await act(async () => container.querySelector<HTMLButtonElement>('button')!.click());
    await act(async () => requests[4].resolve(responses[failed]));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('디자인');
    expect(container.textContent).toContain('Orbit');
    expect(requests.filter(request => request.name === search)).toHaveLength(1);
  });

  it('does not request suggestions for a nonempty main result', async () => {
    await render(1);
    expect(container.textContent).toContain('Orbit');
    expect(requests.map(request => request.name)).toEqual([search]);
  });

  it('distinguishes successful empty suggestions from loading and failure', async () => {
    await render();
    expectStaticResults();
    expect(requests.map(request => request.name)).toEqual([search, categories, trending]);
    await act(async () => {
      requests[1].resolve({ categories: [] });
      requests[2].resolve({ rankedProducts: [] });
    });
    expect(container.textContent).toContain('list.empty.categoriesEmpty');
    expect(container.textContent).toContain('list.empty.trendingEmpty');
    expect(container.querySelector('button, [role="alert"], [role="status"]')).toBeNull();
  });
});
