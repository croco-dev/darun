// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductCard } from '../components/ProductCard/ProductCard';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

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
}));

vi.mock('../uis', () => ({
  ProductItem: ({
    name,
    summary,
    tags,
  }: {
    name: string;
    summary?: string;
    tags?: string[];
    [key: string]: unknown;
  }) => (
    <div data-testid="product-item">
      <span data-testid="product-name">{name}</span>
      {summary && <span data-testid="product-summary">{summary}</span>}
      {tags?.map(tag => (
        <span key={tag} data-testid="product-tag">
          {tag}
        </span>
      ))}
    </div>
  ),
}));

const mockProduct = {
  id: 'prod-1',
  name: 'Notion',
  slug: 'notion',
  logoUrl: '/logo.png',
  summary: 'All-in-one workspace',
  tags: [{ id: 't1', name: 'Productivity' }],
};

describe('ProductCard', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    document.body.replaceChildren();
  });

  it('상품명과 링크를 렌더링한다', () => {
    act(() => {
      root?.render(<ProductCard product={mockProduct} href="/products/notion" source="trending" />);
    });

    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/products/notion');
    expect(container.querySelector('[data-testid="product-name"]')?.textContent).toBe('Notion');
  });

  it('rank가 주어지면 rank 뱃지를 표시한다', () => {
    act(() => {
      root?.render(<ProductCard product={mockProduct} href="/products/notion" source="trending" rank={1} />);
    });

    const badge = container.querySelector('span');
    expect(badge?.textContent).toBe('1');
  });

  it('rank가 없으면 rank 뱃지를 표시하지 않는다', () => {
    act(() => {
      root?.render(<ProductCard product={mockProduct} href="/products/notion" source="search-empty" />);
    });

    expect(container.querySelector('[class*="bg-brand-100"]')).toBeNull();
  });

  it('onClick 핸들러가 링크 클릭 시 호출된다', () => {
    const onClick = vi.fn();
    act(() => {
      root?.render(<ProductCard product={mockProduct} href="/products/notion" source="related" onClick={onClick} />);
    });

    const link = container.querySelector('a');
    act(() => {
      link?.click();
    });

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('data-source 속성이 올바르게 설정된다', () => {
    act(() => {
      root?.render(<ProductCard product={mockProduct} href="/products/notion" source="related" />);
    });

    const link = container.querySelector('a');
    expect(link?.getAttribute('data-source')).toBe('related');
  });
});
