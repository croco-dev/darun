import { useQuery } from '@apollo/client/react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useQuery: vi.fn(),
  };
});

import { useProductLinkTable } from '../useProductLinkTable';

describe('useProductLinkTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load product links without throwing runtime gql errors', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        tempProductBySlug: {
          id: 'prod-1',
          logoUrl: 'https://example.com/logo.png',
          links: [{ id: 'link-1', isPrimary: true }],
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useProductLinkTable({ slug: 'test-slug' }));

    expect(result.current.loading).toBe(false);
    expect(result.current.links).toHaveLength(1);
    expect(result.current.productLogoUrl).toBe('https://example.com/logo.png');
    expect(result.current.error).toBeUndefined();
  });

  it('should return error when query fails', () => {
    const error = new Error('Query error');
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: false,
      error,
    } as unknown as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useProductLinkTable({ slug: 'test-slug' }));

    expect(result.current.error).toBe(error);
  });
});
