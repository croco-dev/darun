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

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) =>
    new Map(
      Object.entries({
        remove: '비교 취소',
        add: '비교에 추가',
        limit: '두 서비스까지 비교할 수 있습니다',
        viewCompare: '선택한 서비스 비교',
        storageError: '저장 실패',
      })
    ).get(key) ?? key,
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
    expect(mockPush).toHaveBeenCalledWith('/ko/compare/product-a/product-b');
  });

  it('preserves both products and explains the limit when adding a third', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['product-a', 'product-b']));

    act(() => {
      root?.render(<CompareButton slug="product-c" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement;
    expect(button).not.toBeNull();

    act(() => {
      button.click();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['product-a', 'product-b']));
    expect(mockPush).not.toHaveBeenCalled();
    expect(container.querySelector('[role="status"]')?.textContent).toContain('두 서비스까지');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/ko/compare/product-a/product-b');
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

  it('does not emit navigation analytics when the compare limit is reached', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['product-a', 'product-b']));

    act(() => {
      root?.render(<CompareButton slug="product-c" source="trending" />);
    });

    const button = container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement;

    act(() => {
      button.click();
    });

    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not navigate or change selection when browser storage rejects the write', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['product-a']));
    act(() => {
      root?.render(<CompareButton slug="product-b" />);
    });
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    act(() => {
      (container.querySelector('[data-testid="compare-button"]') as HTMLButtonElement).click();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['product-a']));
    expect(container.querySelector('[role="status"]')?.textContent).toContain('저장 실패');
    write.mockRestore();
  });
});
