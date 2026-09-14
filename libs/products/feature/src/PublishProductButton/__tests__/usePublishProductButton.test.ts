import { useMutation, useQuery } from '@apollo/client/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock: @apollo/client ──────────────────────────────────────────
vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

// ── Mock: @mantine/notifications ───────────────────────────────────
vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

// ── Import after mocks ─────────────────────────────────────────────
import { usePublishProductButton } from '../usePublishProductButton';

describe('usePublishProductButton', () => {
  const defaultSlug = 'test-product-slug';
  let mutateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();

    vi.mocked(useQuery).mockReturnValue({
      data: { tempProductBySlug: { __typename: 'Product', id: 'product-1', publishedAt: null } },
      loading: false,
    } as ReturnType<typeof useQuery>);

    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  it('negative control: initializes with loading: false when mutation is not loading', () => {
    const { result } = renderHook(() => usePublishProductButton({ slug: defaultSlug }));
    expect(result.current.loading).toBe(false);
  });

  it('should log error and rethrow when publish mutation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePublishProductButton({ slug: defaultSlug }));

    mutateFn.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      act(async () => {
        await result.current.publishProduct();
      })
    ).rejects.toThrow('Network error');

    expect(consoleSpy).toHaveBeenCalledWith('mutation failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should call mutation with the correct variables on success', async () => {
    const { result } = renderHook(() => usePublishProductButton({ slug: defaultSlug }));

    mutateFn.mockResolvedValueOnce({
      data: {
        publishProduct: {
          product: { id: 'product-1', publishedAt: new Date().toISOString() },
        },
      },
    });

    await act(async () => {
      await result.current.publishProduct();
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: { input: { slug: defaultSlug } },
    });
  });

  it('should reflect loading state and prevent duplicate calls when loading', async () => {
    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: true }] as unknown as ReturnType<typeof useMutation>);

    const { result } = renderHook(() => usePublishProductButton({ slug: defaultSlug }));
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await result.current.publishProduct();
    });

    expect(mutateFn).not.toHaveBeenCalled();
  });

  it('should prevent synchronous duplicate concurrent executions', async () => {
    let resolveMutation: () => void;
    mutateFn.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveMutation = () => resolve({ data: { publishProduct: { product: { publishedAt: null } } } });
        })
    );

    const { result } = renderHook(() => usePublishProductButton({ slug: defaultSlug }));

    let p1: Promise<void>;
    let p2: Promise<void>;
    act(() => {
      p1 = result.current.publishProduct();
      p2 = result.current.publishProduct();
    });

    expect(mutateFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutation();
      await Promise.all([p1, p2]);
    });
  });
});
