import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock: next/navigation ────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// ── Mock: @apollo/client to isolate the hook ─────────────────────
vi.mock('@apollo/client', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    gql: vi.fn(),
    useSuspenseQuery: vi.fn(),
  };
});

// ── Mock: generated Suspense query ───────────────────────────────
vi.mock('../__generated__/useProductListTable', () => ({
  useAllProductsOnProductListTableSuspenseQuery: vi.fn(),
}));

// ── Import after mocks ───────────────────────────────────────────
import { useAllProductsOnProductListTableSuspenseQuery } from '../__generated__/useProductListTable';
import { useProductListTable } from '../useProductListTable';

describe('useProductListTable', () => {
  const mockPageInfo = {
    __typename: 'PageInfo' as const,
    endCursor: 'cursor-page-1',
    hasNextPage: true,
    startCursor: 'cursor-start-page-1',
    hasPreviousPage: false,
  };

  const mockPage2Data = {
    allProducts: {
      __typename: 'ProductConnection' as const,
      totalCount: 100,
      edges: [
        {
          __typename: 'ProductEdge' as const,
          cursor: 'cursor-2',
          node: {
            __typename: 'Product' as const,
            id: '2',
            slug: 'product-2',
            name: 'Product 2',
            summary: 'Summary 2',
            logoUrl: 'logo-2.png',
          },
        },
      ],
      pageInfo: {
        __typename: 'PageInfo' as const,
        endCursor: 'cursor-page-2',
        hasNextPage: true,
        startCursor: 'cursor-after-1',
        hasPreviousPage: true,
      },
    },
  };

  // Default mock data: page 1 loaded
  const defaultData = {
    allProducts: {
      __typename: 'ProductConnection' as const,
      totalCount: 100,
      edges: [
        {
          __typename: 'ProductEdge' as const,
          cursor: 'cursor-1',
          node: {
            __typename: 'Product' as const,
            id: '1',
            slug: 'product-1',
            name: 'Product 1',
            summary: 'Summary 1',
            logoUrl: 'logo-1.png',
          },
        },
      ],
      pageInfo: mockPageInfo,
    },
  };

  let refetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    refetchMock = vi.fn().mockResolvedValue({ data: defaultData });

    vi.mocked(useAllProductsOnProductListTableSuspenseQuery).mockReturnValue({
      data: defaultData,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useAllProductsOnProductListTableSuspenseQuery>);
  });

  describe('pageCount — stale closure 방지 (functional update)', () => {
    it('should correctly accumulate pageCount on 3 rapid loadNextPage calls', () => {
      const { result } = renderHook(() => useProductListTable());

      // 연속 3회 호출 — stale closure가 있으면 pageCount가 51에 머무름
      act(() => {
        result.current.loadNextPage();
      });
      act(() => {
        result.current.loadNextPage();
      });
      act(() => {
        result.current.loadNextPage();
      });

      // 각각 50씩 증가: 1 → 51 → 101 → 151
      expect(result.current.pageCount).toBe(151);
    });

    it('should correctly accumulate pageCount on 3 rapid loadPreviousPage calls', () => {
      const { result } = renderHook(() => useProductListTable());

      act(() => {
        result.current.loadPreviousPage();
      });
      act(() => {
        result.current.loadPreviousPage();
      });
      act(() => {
        result.current.loadPreviousPage();
      });

      // 각각 50씩 감소: 1 → -49 → -99 → -149
      expect(result.current.pageCount).toBe(-149);
    });

    it('should handle mixed next/previous calls correctly', () => {
      const { result } = renderHook(() => useProductListTable());

      act(() => {
        result.current.loadNextPage(); // 1 → 51
      });
      act(() => {
        result.current.loadNextPage(); // 51 → 101
      });
      act(() => {
        result.current.loadPreviousPage(); // 101 → 51
      });
      act(() => {
        result.current.loadNextPage(); // 51 → 101
      });

      expect(result.current.pageCount).toBe(101);
    });

    it('should correctly track pageCount after data refresh + re-render', () => {
      const { result, rerender } = renderHook(() => useProductListTable());

      act(() => {
        result.current.loadNextPage(); // 1 → 51
      });

      // Simulate data arriving from refetch (re-render with new data)
      vi.mocked(useAllProductsOnProductListTableSuspenseQuery).mockReturnValue({
        data: {
          ...defaultData,
          allProducts: {
            ...defaultData.allProducts,
            pageInfo: { ...defaultData.allProducts.pageInfo, endCursor: 'cursor-page-2' },
          },
        },
        refetch: refetchMock,
      } as unknown as ReturnType<typeof useAllProductsOnProductListTableSuspenseQuery>);

      rerender();

      act(() => {
        result.current.loadNextPage(); // 51 → 101
      });

      expect(result.current.pageCount).toBe(101);
    });
  });

  describe('refetch cursor — latest data 반영', () => {
    it('should use latest cursor for refetch after data changes and re-render', () => {
      const { result, rerender } = renderHook(() => useProductListTable());

      // First call: page 1 → page 2
      act(() => {
        result.current.loadNextPage();
      });

      // Simulate refetch resolving with page 2 data (re-render)
      vi.mocked(useAllProductsOnProductListTableSuspenseQuery).mockReturnValue({
        data: mockPage2Data,
        refetch: refetchMock,
      } as unknown as ReturnType<typeof useAllProductsOnProductListTableSuspenseQuery>);

      rerender();

      // Second call: page 2 → page 3
      act(() => {
        result.current.loadNextPage();
      });

      expect(refetchMock).toHaveBeenCalledTimes(2);
      // First refetch uses cursor from page 1
      expect(refetchMock).toHaveBeenNthCalledWith(1, {
        first: 50,
        after: 'cursor-page-1',
        last: undefined,
        before: undefined,
      });
      // Second refetch uses cursor from page 2
      expect(refetchMock).toHaveBeenNthCalledWith(2, {
        first: 50,
        after: 'cursor-page-2',
        last: undefined,
        before: undefined,
      });
    });

    it('should use latest cursor for loadPreviousPage after data changes', () => {
      const { result, rerender } = renderHook(() => useProductListTable());

      act(() => {
        result.current.loadPreviousPage();
      });

      vi.mocked(useAllProductsOnProductListTableSuspenseQuery).mockReturnValue({
        data: {
          ...defaultData,
          allProducts: {
            ...defaultData.allProducts,
            pageInfo: {
              ...defaultData.allProducts.pageInfo,
              startCursor: 'cursor-prev-page',
            },
          },
        },
        refetch: refetchMock,
      } as unknown as ReturnType<typeof useAllProductsOnProductListTableSuspenseQuery>);

      rerender();

      act(() => {
        result.current.loadPreviousPage();
      });

      expect(refetchMock).toHaveBeenCalledTimes(2);
      expect(refetchMock).toHaveBeenNthCalledWith(2, {
        first: undefined,
        after: undefined,
        last: 50,
        before: 'cursor-prev-page',
      });
    });
  });

  describe('return values', () => {
    it('should return the correct initial values', () => {
      const { result } = renderHook(() => useProductListTable());

      expect(result.current.pageCount).toBe(1);
      expect(result.current.products[0]?.node.name).toBe('Product 1');
      expect(result.current.totalCount).toBe(100);
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPreviousPage).toBe(false);
      expect(typeof result.current.loadNextPage).toBe('function');
      expect(typeof result.current.loadPreviousPage).toBe('function');
      expect(typeof result.current.handleRowClick).toBe('function');
    });
  });
});
