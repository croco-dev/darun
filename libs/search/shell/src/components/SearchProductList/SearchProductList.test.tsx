// @vitest-environment jsdom

import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider, useQuery } from '@apollo/client/react';
import { initPostHog, ProductDetailViewTracker } from '@darun/analytics-client';
import {
  CompactCategoriesForSearchProductListDocument,
  CompactTrendingPreviewForSearchProductListDocument,
} from '@darun/provider-graphql';
import posthog from 'posthog-js';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchProductList } from './SearchProductList';
import { useSearchProductList } from './useSearchProductList';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const { countState, navigation } = vi.hoisted(() => ({
  countState: { value: 10 as number | null },
  navigation: { locale: 'ko', searchParams: new URLSearchParams() },
}));

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn((_key: string, config: { loaded: () => void }) => config.loaded()),
    capture: vi.fn(),
  },
}));

const mockPush = vi.fn();
const mockNavigate = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => 'notion',
  }),
}));

vi.mock('@darun/utils-router', () => ({
  Link: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useSearchParams: () => navigation.searchParams,
}));

vi.mock('next-intl', () => ({
  useLocale: () => navigation.locale,
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    if (key === 'list.empty.noResults') {
      return `'${values?.query}'에 대한 검색 결과가 없습니다.`;
    }
    if (key === 'list.empty.description') {
      return '다른 검색어를 입력하거나 아래 추천 항목을 확인해 보세요.';
    }
    return key;
  },
}));

vi.mock('@darun/utils-structure-react', () => ({
  bind: (
    hook: (props: Record<string, unknown>) => Record<string, unknown>,
    component: (props: Record<string, unknown>) => React.ReactNode
  ) => {
    return (props: Record<string, unknown>) => {
      const hookData = hook(props);
      return component({ ...props, ...hookData });
    };
  },
}));

vi.mock('./useSearchProductList', () => ({
  useSearchProductList: vi.fn(),
}));

vi.mock('@apollo/client/react', async importOriginal => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useQuery: vi.fn(() => ({
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    data: {
      categories: [{ id: '1', slug: 'collaboration', labelKo: '협업툴', labelEn: 'Collaboration' }],
      rankedProducts: [{ id: '100', name: 'Product A', slug: 'product-a', voteCount: countState.value, tags: [] }],
    },
  })),
}));

describe('SearchProductList', () => {
  let root: Root | undefined;
  let client: ApolloClient;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-key');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'http://localhost');
    initPostHog();
    countState.value = 10;
    navigation.locale = 'ko';
    navigation.searchParams = new URLSearchParams();
    vi.mocked(posthog.capture).mockClear();
    client = new ApolloClient({ cache: new InMemoryCache(), link: ApolloLink.empty() });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage?.clear();
    mockPush.mockClear();
    mockNavigate.mockClear();
    vi.mocked(useQuery).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    client.stop();
    document.body.replaceChildren();
  });

  it('renders products as search cards', () => {
    const mockProducts = [
      {
        id: '1',
        slug: 'notion',
        name: 'Notion',
        logoUrl: '/logo.png',
        summary: 'All-in-one workspace',
        tags: [{ id: 't1', name: 'Productivity' }],
        features: [],
      },
    ];

    vi.mocked(useSearchProductList).mockReturnValue({
      products: mockProducts,
      query: 'notion',
    });

    act(() => {
      root?.render(
        <ApolloProvider client={client}>
          <SearchProductList query="notion" />
        </ApolloProvider>
      );
    });

    const searchCard = container.querySelector('[data-source="search"]');
    expect(searchCard).not.toBeNull();
    expect(useQuery).not.toHaveBeenCalled();
  });

  it('renders popular queries and categories in empty search state', () => {
    vi.mocked(useSearchProductList).mockReturnValue({
      products: [],
      query: 'notion',
    });

    act(() => {
      root?.render(
        <ApolloProvider client={client}>
          <SearchProductList query="notion" />
        </ApolloProvider>
      );
    });

    expect(container.textContent).toContain('검색 결과가 없습니다');
    expect(container.querySelector('[data-testid="search-empty-popular-queries"]')).not.toBeNull();
    expect(useQuery).toHaveBeenCalledWith(CompactCategoriesForSearchProductListDocument, {
      variables: { first: 4, locale: 'ko' },
    });
    expect(useQuery).toHaveBeenCalledWith(CompactTrendingPreviewForSearchProductListDocument, {
      variables: { first: 3, locale: 'ko' },
    });
    expect(container.querySelector('[aria-label="추천 10"]')).not.toBeNull();
  });

  it.each([
    ['ko', '프로덕트헌트'],
    ['en', 'Product Hunt'],
  ])('records each empty search shortcut and passes product attribution in the %s link', (locale, queryText) => {
    navigation.locale = locale;
    vi.mocked(useSearchProductList).mockReturnValue({
      products: [],
      query: 'notion',
    });
    act(() => {
      root?.render(
        <ApolloProvider client={client}>
          <SearchProductList query="notion" />
        </ApolloProvider>
      );
    });

    const shortcuts = [
      ['[data-testid="search-empty-popular-queries"] a', 'empty_search_stripe_clicked', { queryText }],
      [
        '[data-testid="search-empty-categories"] a',
        'category_chip_clicked',
        {
          categorySlug: 'collaboration',
          source: 'empty-grid',
        },
      ],
      [
        'a[data-source="search-empty"]',
        'ranked_product_clicked',
        {
          productSlug: 'product-a',
          source: 'search-empty-trending',
        },
      ],
    ] as const;
    for (const [selector, event, properties] of shortcuts) {
      const link = container.querySelector<HTMLAnchorElement>(selector)!;
      for (const [type, button] of [
        ['click', 0],
        ['auxclick', 1],
      ] as const) {
        vi.mocked(posthog.capture).mockClear();
        link.addEventListener(type, click => click.preventDefault(), { once: true });
        act(() => link.dispatchEvent(new MouseEvent(type, { button, bubbles: true, cancelable: true })));
        expect.soft(posthog.capture, `${selector} ${type}`).toHaveBeenCalledExactlyOnceWith(event, properties);
      }
      vi.mocked(posthog.capture).mockClear();
      act(() => link.dispatchEvent(new MouseEvent('auxclick', { button: 2, bubbles: true })));
      expect(posthog.capture).not.toHaveBeenCalled();
    }

    const productLink = container.querySelector<HTMLAnchorElement>('a[data-source="search-empty"]')!;
    const href = new URL(productLink.href);
    expect(href.pathname).toBe(`/${locale}/products/product-a`);
    navigation.searchParams = href.searchParams;
    vi.mocked(posthog.capture).mockClear();
    act(() => root?.render(<ProductDetailViewTracker key="recommended" productSlug="product-a" />));
    expect.soft(posthog.capture).toHaveBeenCalledExactlyOnceWith('product_detail_viewed', {
      productSlug: 'product-a',
      source: 'empty-stripe',
    });

    navigation.searchParams = new URLSearchParams();
    vi.mocked(posthog.capture).mockClear();
    act(() => root?.render(<ProductDetailViewTracker key="direct" productSlug="product-a" />));
    expect(posthog.capture).toHaveBeenCalledExactlyOnceWith('product_detail_viewed', {
      productSlug: 'product-a',
      source: 'direct',
    });
  });

  it('retries a recommended product count without recording a product navigation', async () => {
    countState.value = null;
    vi.mocked(useSearchProductList).mockReturnValue({ products: [], query: 'notion' });
    await act(async () =>
      root?.render(
        <ApolloProvider client={client}>
          <SearchProductList query="notion" />
        </ApolloProvider>
      )
    );
    const retry = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === '추천 수 다시 조회'
    );
    expect(retry).toBeDefined();
    await act(async () => retry!.click());
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
