// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlternativeProductList } from './AlternativeProductList';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'ko',
}));

vi.mock('@darun/utils-router', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href?: string; [key: string]: unknown }) => (
    <a href={href} {...props} data-testid="mock-link">
      {children}
    </a>
  ),
}));

describe('AlternativeProductList', () => {
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

  it('renders alternative list with compare buttons not nested under links', () => {
    const mockAlternatives = [
      {
        id: 'alt-1',
        name: '대안 제품 1',
        slug: 'alt-1-slug',
        summary: '요약 1',
        logoUrl: '/logo1.png',
        tags: [{ id: 'tag-1', name: '태그1' }],
      },
    ];

    act(() => {
      root?.render(<AlternativeProductList.ViewComponent slug="base-slug" alternatives={mockAlternatives} />);
    });

    const compareButton = container.querySelector('[data-testid="compare-button"]');
    expect(compareButton).not.toBeNull();

    const linkAncestor = compareButton?.closest('[data-testid="mock-link"]');
    expect(linkAncestor).toBeNull();
  });
});
