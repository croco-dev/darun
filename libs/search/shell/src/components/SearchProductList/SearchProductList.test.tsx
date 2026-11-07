// @vitest-environment jsdom

import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider, useSuspenseQuery } from '@apollo/client/react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchProductList } from './SearchProductList';
import { useSearchProductList } from './useSearchProductList';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

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
  useSearchParams: () => ({
    get: (key: string) => 'notion',
  }),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
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
  useSuspenseQuery: vi.fn(() => ({
    data: {
      categories: [{ id: '1', slug: 'collaboration', labelKo: '협업툴', labelEn: 'Collaboration' }],
      rankedProducts: [{ id: '100', name: 'Product A', slug: 'product-a', voteCount: 10, tags: [] }],
    },
  })),
}));

describe('SearchProductList', () => {
  let root: Root | undefined;
  let client: ApolloClient;
  let container: HTMLDivElement;

  beforeEach(() => {
    client = new ApolloClient({ cache: new InMemoryCache(), link: ApolloLink.empty() });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage?.clear();
    mockPush.mockClear();
    mockNavigate.mockClear();
    vi.mocked(useSuspenseQuery).mockClear();
  });

  afterEach(() => {
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
    expect(useSuspenseQuery).not.toHaveBeenCalled();
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
    expect(useSuspenseQuery).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[aria-label="추천 10"]')).not.toBeNull();
  });
});
