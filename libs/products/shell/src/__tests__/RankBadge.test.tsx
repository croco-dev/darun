// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RankBadge } from '../uis/RankBadge';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let currentLocale = 'ko';

vi.mock('next-intl', () => ({
  useLocale: () => currentLocale,
}));

describe('RankBadge', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentLocale = 'ko';
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container.remove();
  });

  it('renders rank and Korean aria-label by default', () => {
    currentLocale = 'ko';
    act(() => {
      root?.render(<RankBadge rank={1} />);
    });

    const badge = container.querySelector('span');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('1');
    expect(badge?.getAttribute('aria-label')).toBe('1위');
  });

  it('renders English aria-label when locale is en', () => {
    currentLocale = 'en';
    act(() => {
      root?.render(<RankBadge rank={3} />);
    });

    const badge = container.querySelector('span');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('3');
    expect(badge?.getAttribute('aria-label')).toBe('Rank 3');
  });

  it('applies size classes correctly', () => {
    act(() => {
      root?.render(<RankBadge rank={1} size="md" />);
    });

    const badge = container.querySelector('span');
    expect(badge?.className).toContain('h-9');
    expect(badge?.className).toContain('w-9');
  });
});
