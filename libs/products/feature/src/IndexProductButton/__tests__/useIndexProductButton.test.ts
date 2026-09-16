import { useMutation } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIndexProductButton } from '../useIndexProductButton';

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
  };
});

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

describe('useIndexProductButton', () => {
  const defaultSlug = 'test-slug';
  let mutateFn: ReturnType<typeof vi.fn>;
  let mutationOptions: { onCompleted?: (data: unknown) => void; onError?: (e: Error) => void };

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    mutationOptions = {};

    vi.mocked(useMutation).mockImplementation(((_document: unknown, options?: unknown) => {
      mutationOptions = (options as { onCompleted?: (data: unknown) => void; onError?: (e: Error) => void }) || {};
      return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);
  });

  it('calls mutation with the correct variables and shows notification on completion', async () => {
    const { result } = renderHook(() => useIndexProductButton({ slug: defaultSlug }));

    await act(async () => {
      await result.current.indexProduct();
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        input: { slug: defaultSlug },
      },
    });

    act(() => {
      mutationOptions.onCompleted?.({ indexProduct: { indexed: true } });
    });
    expect(notifications.show).toHaveBeenCalledWith({
      message: '상품이 색인되었습니다.',
      color: 'teal',
    });
  });

  it('safely catches errors and does not re-throw unhandled rejection', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mutateFn.mockRejectedValueOnce(new Error('Index failed'));

    const { result } = renderHook(() => useIndexProductButton({ slug: defaultSlug }));

    await expect(
      act(async () => {
        await result.current.indexProduct();
      })
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('mutation failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('prevents indexProduct execution while loading', async () => {
    vi.mocked(useMutation).mockImplementation((() => {
      return [mutateFn, { loading: true }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);

    const { result } = renderHook(() => useIndexProductButton({ slug: defaultSlug }));

    await act(async () => {
      await result.current.indexProduct();
    });

    expect(mutateFn).not.toHaveBeenCalled();
  });
});
