// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { SearchProductsOnSearchProductListDocument } from '@darun/provider-graphql';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Component, Suspense, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchProductList } from '../../../libs/search/shell/src/components/SearchProductList/SearchProductList';
import LocaleError from '../app/[locale]/error';
import SearchError from '../app/[locale]/search/error';
import en from '../messages/en.json';
import ko from '../messages/ko.json';

const route = vi.hoisted(() => ({ locale: 'ko', query: 'notion' }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: route.locale }),
  useSearchParams: () => new URLSearchParams({ query: route.query }),
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@darun/analytics-client', () => ({
  AnalyticsEvents: {},
  track: vi.fn(),
}));
vi.mock('../i18n/navigation', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@darun/ui-layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@darun/products-shell', () => ({
  ProductCard: ({ product }: { product: { name: string } }) => <article>{product.name}</article>,
  getCategoryIcon: () => '',
}));

class SearchBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  reset = () => this.setState({ error: null });
  render() {
    return this.state.error ? <SearchError error={this.state.error} retry={this.reset} /> : this.props.children;
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  route.locale = 'ko';
});

describe('route error recovery', () => {
  it.each(['ko', 'en'])('%s 서버 오류는 Next의 재조회 retry를 실행한다', locale => {
    route.locale = locale;
    const retry = vi.fn();
    render(<LocaleError error={new Error('server unavailable')} retry={retry} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: locale === 'ko' ? '다시 시도' : 'Try again',
      })
    );
    expect(retry).toHaveBeenCalledOnce();
  });

  it.each([
    ['ko', 'SearchProductsOnSearchProductList'],
    ['en', 'SearchProductsOnSearchProductList'],
    ['ko', 'CompactCategoriesForSearchProductList'],
    ['en', 'CompactTrendingPreviewForSearchProductList'],
  ])('%s %s: 즉시 재시도와 반복 실패 뒤에도 같은 조회를 새로 요청한다', async (locale, target) => {
    route.locale = locale;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let unrelatedRequests = 0;
    const successfulReads: string[] = [];
    const requests: {
      variables: Record<string, unknown>;
      fail: () => void;
      succeed: () => void;
    }[] = [];
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            if (
              operation.operationName === 'SearchProductsOnSearchProductList' &&
              (operation.variables.query !== 'notion' || operation.variables.locale !== locale)
            ) {
              unrelatedRequests++;
              observer.error(new Error('unrelated failure'));
              return;
            }
            if (operation.operationName !== target) {
              successfulReads.push(operation.operationName);
              observer.next({ data: { searchProducts: [], categories: [], rankedProducts: [] } });
              observer.complete();
              return;
            }
            requests.push({
              variables: operation.variables,
              fail: () => observer.error(new Error('temporary search failure')),
              succeed: () => {
                observer.next({
                  data: {
                    categories: [],
                    rankedProducts: [],
                    searchProducts: [
                      {
                        __typename: 'Product',
                        id: 'notion',
                        slug: 'notion',
                        name: 'Recovered Notion',
                        summary: 'Recovered',
                        logoUrl: null,
                        tags: [],
                      },
                    ],
                  },
                });
                observer.complete();
              },
            });
          })
      ),
    });
    const unrelated = [
      { query: 'other', locale },
      { query: 'notion', locale: locale === 'ko' ? 'en' : 'ko' },
    ].map(variables =>
      client
        .watchQuery({
          query: SearchProductsOnSearchProductListDocument,
          variables,
        })
        .subscribe({ next: () => {}, error: () => {} })
    );
    try {
      await act(async () =>
        render(
          <NextIntlClientProvider locale={locale} messages={locale === 'ko' ? ko : en}>
            <ApolloProvider client={client}>
              <SearchBoundary>
                <Suspense fallback={<p>loading</p>}>
                  <SearchProductList query={route.query} />
                </Suspense>
              </SearchBoundary>
            </ApolloProvider>
          </NextIntlClientProvider>
        )
      );
      expect(requests).toHaveLength(1);
      await act(async () => requests[0].fail());
      const initialSuccessfulReads = [...successfulReads];
      const retryName = locale === 'ko' ? '다시 시도' : 'Try again';
      await act(async () => {
        const button = screen.getByRole('button', { name: retryName });
        fireEvent.click(button);
        fireEvent.click(button);
      });
      expect(requests).toHaveLength(2);
      expect(screen.getByRole('button', { name: retryName }).getAttribute('disabled')).not.toBeNull();
      await act(async () => requests[1].fail());
      expect(screen.getByRole('button', { name: retryName })).toBeTruthy();
      await act(async () => fireEvent.click(screen.getByRole('button', { name: retryName })));
      expect(requests).toHaveLength(3);
      expect(requests.map(request => request.variables)).toEqual(
        Array.from({ length: 3 }, () =>
          target === 'SearchProductsOnSearchProductList'
            ? { query: 'notion', locale }
            : { first: target === 'CompactCategoriesForSearchProductList' ? 4 : 3, locale }
        )
      );
      await act(async () => requests[2].succeed());
      if (target === 'SearchProductsOnSearchProductList') expect(screen.getByText('Recovered Notion')).toBeTruthy();
      else expect(screen.queryByTestId('error-search')).toBeNull();
      for (const name of initialSuccessfulReads) {
        expect(successfulReads.filter(operation => operation === name)).toHaveLength(1);
      }
      expect(unrelatedRequests).toBe(2);
    } finally {
      cleanup();
      unrelated.forEach(subscription => subscription.unsubscribe());
      client.stop();
    }
  });
});
