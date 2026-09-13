import { useQuery } from '@apollo/client/react';
import { useFragment } from '@darun/provider-graphql';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useQuery: vi.fn(),
  };
});

vi.mock('@darun/provider-graphql', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useFragment: vi.fn(),
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
          links: [{ id: 'link-1', isPrimary: true }],
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);

    vi.mocked(useFragment).mockReturnValue({
      links: [{ id: 'link-1', isPrimary: true }],
    });

    const { result } = renderHook(() => useProductLinkTable({ slug: 'test-slug' }));

    expect(result.current.loading).toBe(false);
    expect(result.current.links).toHaveLength(1);
  });
});
