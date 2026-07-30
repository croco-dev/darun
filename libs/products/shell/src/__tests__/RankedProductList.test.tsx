// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RankedProductList } from '../components/RankedProductList/RankedProductList';
import { useRankedProductList } from '../components/RankedProductList/useRankedProductList';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

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

vi.mock('@darun/analytics-client', () => ({
  track: vi.fn(),
  AnalyticsEvents: { RANKED_PRODUCT_CLICKED: 'ranked_product_clicked' },
}));

vi.mock('@darun/utils-router', () => ({
  Link: ({ children, href, onClick }: { children: React.ReactNode; href?: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock('../components/RankedProductList/useRankedProductList', () => ({
  useRankedProductList: vi.fn(),
}));

vi.mock('../uis', () => ({
  ProductItem: ({ name }: { name: string }) => <div data-testid="product-item">{name}</div>,
}));

const mockProducts = [
  { id: '1', slug: 'notion', name: 'Notion', logoUrl: '/logo1.png', summary: 'All-in-one', voteCount: 100, tags: [] },
  { id: '2', slug: 'figma', name: 'Figma', logoUrl: '/logo2.png', summary: 'Design tool', voteCount: 80, tags: [] },
];

describe('RankedProductList', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.mocked(useRankedProductList).mockReturnValue({ products: mockProducts });
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    document.body.replaceChildren();
  });

  it('상품 목록을 1-based 순위와 함께 렌더링한다', () => {
    act(() => {
      root?.render(<RankedProductList />);
    });

    const items = container.querySelectorAll('[data-testid="product-item"]');
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toBe('Notion');
    expect(items[1]?.textContent).toBe('Figma');
  });

  it('각 상품 링크가 /products/{slug}?from=trending 경로를 가진다', () => {
    act(() => {
      root?.render(<RankedProductList />);
    });

    const links = container.querySelectorAll('a');
    expect(links[0]?.getAttribute('href')).toBe('/products/notion?from=trending');
    expect(links[1]?.getAttribute('href')).toBe('/products/figma?from=trending');
  });

  it('빈 목록이면 아무것도 렌더링하지 않는다', () => {
    vi.mocked(useRankedProductList).mockReturnValue({ products: [] });

    act(() => {
      root?.render(<RankedProductList />);
    });

    const items = container.querySelectorAll('[data-testid="product-item"]');
    expect(items).toHaveLength(0);
  });
});
