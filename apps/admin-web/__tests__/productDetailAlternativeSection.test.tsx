// @vitest-environment jsdom
import { useQuery } from '@apollo/client/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDetailAlternativeSection } from '../features/products/ProductDetailAlternativeSection/ProductDetailAlternativeSection';

vi.mock('@apollo/client/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@darun/products-feature', () => ({
  EditAlternativeProducts: () => <div data-testid="edit-alternative-products">EditAlternativeProducts</div>,
}));

vi.mock('@darun/ui-admin', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    AdminModal: ({ opened, title, children }: { opened: boolean; title: string; children: React.ReactNode }) =>
      opened ? (
        <div data-testid="admin-modal" aria-label={title}>
          {children}
        </div>
      ) : null,
  };
});

describe('ProductDetailAlternativeSection', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when query is loading', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<ProductDetailAlternativeSection slug="test-slug" />);

    expect(screen.getByText('대안 서비스를 불러오는 중...')).toBeTruthy();
  });

  it('renders error state with retry button when query fails', () => {
    const refetch = vi.fn();
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error('Network error'),
      refetch,
    } as unknown as ReturnType<typeof useQuery>);

    render(<ProductDetailAlternativeSection slug="test-slug" />);

    expect(screen.getByText('다시 시도')).toBeTruthy();
    fireEvent.click(screen.getByText('다시 시도'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when alternatives array is empty', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        tempProductBySlug: {
          alternatives: [],
        },
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<ProductDetailAlternativeSection slug="test-slug" />);

    expect(screen.getByText('등록된 대안 서비스가 없습니다.')).toBeTruthy();
  });

  it('renders alternatives list and opens edit modal on button click', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        tempProductBySlug: {
          alternatives: [
            { id: 'alt-1', name: '쿠팡' },
            { id: 'alt-2', name: '11번가' },
          ],
        },
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<ProductDetailAlternativeSection slug="test-slug" />);

    expect(screen.getByText('현재 연결된 대안 서비스 (2개):')).toBeTruthy();
    expect(screen.getByText('쿠팡')).toBeTruthy();
    expect(screen.getByText('11번가')).toBeTruthy();

    expect(screen.queryByTestId('edit-alternative-products')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '대안 서비스 수정/추가' }));

    expect(screen.getByTestId('edit-alternative-products')).toBeTruthy();
  });
});
