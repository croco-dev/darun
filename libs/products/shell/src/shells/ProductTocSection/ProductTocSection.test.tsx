// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductTocSection } from './ProductTocSection';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('../../components', () => ({
  ProductTableOfContent: () => <div data-testid="mock-toc">Mock Table Of Content</div>,
}));

describe('ProductTocSection', () => {
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

  it('renders fixed section with offset spacer', () => {
    act(() => {
      root?.render(<ProductTocSection.ViewComponent isFixed={true} />);
    });
    expect(container.querySelector('[data-testid="mock-toc"]')).not.toBeNull();
    expect(container.innerHTML).toContain('h-10');
  });

  it('renders relative section without offset spacer', () => {
    act(() => {
      root?.render(<ProductTocSection.ViewComponent isFixed={false} />);
    });
    expect(container.querySelector('[data-testid="mock-toc"]')).not.toBeNull();
    expect(container.innerHTML).not.toContain('h-10');
  });
});
