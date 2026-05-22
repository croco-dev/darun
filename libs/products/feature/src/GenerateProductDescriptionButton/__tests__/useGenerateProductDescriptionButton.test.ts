import { useMutation, type ApolloCache, type DocumentNode, type MutationHookOptions } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
  };
});

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { useGenerateProductDescriptionButton } from '../useGenerateProductDescriptionButton';

describe('useGenerateProductDescriptionButton', () => {
  const defaultSlug = 'test-product-slug';
  type MockMutationOptions = MutationHookOptions<unknown, unknown, unknown, ApolloCache<unknown>>;
  let mutateFn: ReturnType<typeof vi.fn>;
  let mutationOptions: { onCompleted?: () => void; onError?: (e: Error) => void };

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    mutationOptions = {};

    vi.mocked(useMutation).mockImplementation((_document?: DocumentNode, options?: MockMutationOptions) => {
      mutationOptions = (options as { onCompleted?: () => void; onError?: (e: Error) => void }) || {};
      return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    });
  });

  it('should show success notification on completed', () => {
    renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    act(() => {
      mutationOptions.onCompleted?.();
    });

    expect(notifications.show).toHaveBeenCalledWith({
      message: 'AI 소개를 생성했어요.',
      color: 'teal',
    });
  });

  it('should show error notification on GraphQL error', () => {
    renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    act(() => {
      mutationOptions.onError?.(new Error('GraphQL error'));
    });

    expect(notifications.show).toHaveBeenCalledWith({
      title: '생성 실패',
      message: 'GraphQL error',
      color: 'red',
    });
  });

  it('should log error and rethrow when mutation fails with network error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    mutateFn.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      act(async () => {
        await result.current.handleGenerate();
      })
    ).rejects.toThrow('Network error');

    expect(consoleSpy).toHaveBeenCalledWith('generate description failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should call mutation with the correct variables on success', async () => {
    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    mutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'product-1', name: 'Test', description: 'AI description' },
        },
      },
    });

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: { input: { slug: defaultSlug } },
    });
  });
});
