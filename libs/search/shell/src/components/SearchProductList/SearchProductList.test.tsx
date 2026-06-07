// @vitest-environment jsdom

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

vi.mock('@croco/utils-structure-react', () => ({
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

vi.mock('@apollo/client/react', () => ({
  useSuspenseQuery: () => ({
    data: {
      categories: [{ id: '1', slug: 'collaboration', labelKo: '협업툴', labelEn: 'Collaboration' }],
      rankedProducts: [{ id: '100', name: 'Product A', slug: 'product-a', voteCount: 10, tags: [] }],
    },
  }),
}));

describe('SearchProductList', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    mockPush.mockClear();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    document.body.replaceChildren();
  });

  it('renders products with a compare button next to each item', () => {
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
    });

    act(() => {
      root?.render(<SearchProductList query="notion" />);
    });

    const searchCard = container.querySelector('[data-testid="search-card"]');
    expect(searchCard).not.toBeNull();

    const compareButton = container.querySelector('[data-testid="compare-button"]');
    expect(compareButton).not.toBeNull();
    expect(compareButton?.textContent).toContain('비교에 추가');
  });

  it('renders instructions to compare in empty search state', () => {
    vi.mocked(useSearchProductList).mockReturnValue({
      products: [],
    });

    act(() => {
      root?.render(<SearchProductList query="notion" />);
    });

    expect(container.textContent).toContain('검색 결과가 없습니다');
    expect(container.textContent).toContain('두 서비스를 선택해 비교할 수 있습니다');
  });
});
