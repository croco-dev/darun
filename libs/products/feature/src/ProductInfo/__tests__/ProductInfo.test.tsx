import { render, screen, cleanup } from '@testing-library/react';
import { createElement, memo } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ProductInfo } from '../ProductInfo';
import { useProductInfo } from '../useProductInfo';

vi.mock('@darun/utils-structure-react', () => ({
  bind: vi.fn(
    (
      useHook: (props: Record<string, unknown>) => Record<string, unknown>,
      View: React.ComponentType<Record<string, unknown>>
    ) => {
      const ViewComponent = memo(View);
      const Bound = memo((props: Record<string, unknown>) => createElement(ViewComponent, useHook(props)));
      return Object.assign(Bound, { ViewComponent });
    }
  ),
}));

vi.mock('../useProductInfo', () => ({
  useProductInfo: vi.fn(),
}));

describe('ProductInfo', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders name, summary, and slug when provided', () => {
    vi.mocked(useProductInfo).mockReturnValue({
      name: '토스',
      slug: 'toss',
      summary: '금융이 쉬워진다',
      logoUrl: 'https://example.com/logo.png',
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(<ProductInfo slug="toss" />);

    expect(screen.getByText('토스')).toBeDefined();
    expect(screen.getByText('금융이 쉬워진다')).toBeDefined();
    expect(screen.getByText('toss')).toBeDefined();
  });

  it('renders fallback placeholder when summary is empty or undefined', () => {
    vi.mocked(useProductInfo).mockReturnValue({
      name: '토스',
      slug: 'toss',
      summary: '',
      logoUrl: 'https://example.com/logo.png',
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(<ProductInfo slug="toss" />);

    const fallbackEl = screen.getByText('한 줄 소개가 없습니다.');
    expect(fallbackEl).toBeDefined();
    expect(fallbackEl.className).toContain('italic');
  });
});
