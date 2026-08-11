// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompareButton } from './CompareButton';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const { mockTrack, mockAnalyticsEvents } = vi.hoisted(() => ({
  mockTrack: vi.fn(),
  mockAnalyticsEvents: { COMPARE_CTA_CLICKED: 'compare_cta_clicked' },
}));

vi.mock('@darun/analytics-client', () => ({
  track: mockTrack,
  AnalyticsEvents: mockAnalyticsEvents,
}));

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const STORAGE_KEY = 'compare-products';

describe('CompareButton', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    mockPush.mockClear();
    mockTrack.mockClear();
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    document.body.replaceChildren();
  });

  it('renders default state when localStorage is empty', () => {
    act(() => {
      root?.render(<CompareButton slug="product-1" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('비교에 추가');
  });

  it('renders active state when slug is in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['product-1']));

    act(() => {
      root?.render(<CompareButton slug="product-1" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('비교 취소');
  });

  it('adds product to compare list on click when list is empty', () => {
    act(() => {
      root?.render(<CompareButton slug="product-1" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement;
    expect(button).not.toBeNull();

    act(() => {
      button.click();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['product-1']));
    expect(button.textContent).toContain('비교 취소');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('removes product from compare list on click when product is already in list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['product-1']));

    act(() => {
      root?.render(<CompareButton slug="product-1" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement;
    expect(button).not.toBeNull();

    act(() => {
      button.click();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify([]));
    expect(button.textContent).toContain('비교에 추가');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to compare page when a second product is added', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['product-a']));

    act(() => {
      root?.render(<CompareButton slug="product-b" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement;
    expect(button).not.toBeNull();

    act(() => {
      button.click();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['product-a', 'product-b']));
    expect(mockPush).toHaveBeenCalledWith('/compare/product-a/product-b');
  });

  it('shifts first item when adding a third item and navigates to compare page', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['product-a', 'product-b']));

    act(() => {
      root?.render(<CompareButton slug="product-c" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement;
    expect(button).not.toBeNull();

    act(() => {
      button.click();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['product-b', 'product-c']));
    expect(mockPush).toHaveBeenCalledWith('/compare/product-b/product-c');
  });

  it('emits add event when first product is added to empty compare list', () => {
    act(() => {
      root?.render(<CompareButton slug="product-1" source="search" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement;

    act(() => {
      button.click();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('compare_cta_clicked', {
      productSlug: 'product-1',
      action: 'add',
      source: 'search',
      compareCount: 1,
    });
  });

  it('emits remove event when product is removed from compare list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['product-1']));

    act(() => {
      root?.render(<CompareButton slug="product-1" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement;

    act(() => {
      button.click();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('compare_cta_clicked', {
      productSlug: 'product-1',
      action: 'remove',
      source: 'direct',
      compareCount: 0,
    });
  });

  it('emits navigate event when second product is added', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['product-a']));

    act(() => {
      root?.render(<CompareButton slug="product-b" source="related" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement;

    act(() => {
      button.click();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('compare_cta_clicked', {
      productSlug: 'product-b',
      action: 'navigate',
      source: 'related',
      compareCount: 2,
      targetSlug: 'product-a',
    });
  });

  it('emits shift+navigate event when third product is added', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['product-a', 'product-b']));

    act(() => {
      root?.render(<CompareButton slug="product-c" source="trending" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement;

    act(() => {
      button.click();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('compare_cta_clicked', {
      productSlug: 'product-c',
      action: 'navigate',
      source: 'trending',
      compareCount: 2,
      targetSlug: 'product-b',
    });
  });
});
