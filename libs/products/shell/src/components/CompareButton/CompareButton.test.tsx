// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompareButton } from './CompareButton';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

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
});
