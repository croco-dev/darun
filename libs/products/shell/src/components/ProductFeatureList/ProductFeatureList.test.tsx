// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductFeatureList } from './ProductFeatureList';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => (key === 'empty' ? '등록된 상세 기능 정보가 아직 없습니다.' : key),
  useLocale: () => 'ko',
}));

describe('ProductFeatureList', () => {
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

  it('renders features empty state without crashing', () => {
    act(() => {
      root?.render(<ProductFeatureList.ViewComponent features={[]} />);
    });
    expect(container.textContent).toContain('등록된 상세 기능 정보가 아직 없습니다.');
  });

  it('renders list of features', () => {
    const mockFeatures = [
      {
        id: 'feat-1',
        name: 'Feature A',
        emoji: '🚀',
        summary: 'Summary of feature A',
        screenshots: [
          {
            id: 'scr-1',
            imageAlt: 'Screenshot A',
            imageUrl: '/scr1.png',
          },
        ],
      },
    ];

    act(() => {
      root?.render(<ProductFeatureList.ViewComponent features={mockFeatures} />);
    });

    expect(container.textContent).toContain('Feature A');
    expect(container.textContent).toContain('Summary of feature A');
  });
});
