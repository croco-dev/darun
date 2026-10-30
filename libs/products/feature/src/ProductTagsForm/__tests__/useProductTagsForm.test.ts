import { type ApolloCache, type DocumentNode } from '@apollo/client';
import { useMutation, useQuery, type MutationHookOptions } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
    useQuery: vi.fn(),
  };
});

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { useProductTagsForm } from '../useProductTagsForm';

describe('useProductTagsForm', () => {
  const defaultSlug = 'test-slug';
  type MockMutationOptions = MutationHookOptions<unknown, Record<string, unknown>, unknown, ApolloCache>;
  let mutateFn: ReturnType<typeof vi.fn>;
  let mutationOptions: {
    onCompleted?: (data: unknown) => void;
    onError?: (e: Error) => void;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    mutationOptions = {};

    vi.mocked(useQuery).mockReturnValue({
      data: {
        tempProductBySlug: {
          id: 'product-1',
          tags: [
            { id: 't1', name: '핀테크' },
            { id: 't2', name: '결제' },
          ],
        },
      },
      loading: false,
    } as unknown as ReturnType<typeof useQuery>);

    vi.mocked(useMutation).mockImplementation(((_document?: DocumentNode, options?: MockMutationOptions) => {
      mutationOptions =
        (options as {
          onCompleted?: (data: unknown) => void;
          onError?: (e: Error) => void;
        }) || {};
      return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);
  });

  it('keeps each fetched or edited name as one array entry', () => {
    const { result } = renderHook(() => useProductTagsForm({ slug: defaultSlug }));
    expect(result.current.tags).toEqual(['핀테크', '결제']);
    act(() => result.current.changeTag(0, 'Research, Development'));
    act(() => result.current.addTag());
    act(() => result.current.changeTag(2, 'C++ (도구)'));
    expect(result.current.tags).toEqual(['Research, Development', '결제', 'C++ (도구)']);
    act(() => result.current.removeTag(1));
    expect(result.current.tags).toEqual(['Research, Development', 'C++ (도구)']);
  });

  it('trims names and removes empty and duplicate entries without splitting commas', async () => {
    const { result } = renderHook(() => useProductTagsForm({ slug: defaultSlug }));
    act(() => result.current.changeTag(0, ' Research, Development '));
    act(() => result.current.changeTag(1, 'Research, Development'));
    act(() => result.current.addTag());
    await act(async () => result.current.applyTags());
    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        slug: defaultSlug,
        input: { tagNames: ['Research, Development'] },
      },
    });
  });

  it('keeps a draft on failure and switches to the other product values on navigation', async () => {
    mutateFn.mockRejectedValueOnce(new Error('save failed'));
    const { result, rerender } = renderHook(({ slug }) => useProductTagsForm({ slug }), {
      initialProps: { slug: defaultSlug },
    });
    act(() => result.current.changeTag(0, '미저장, 초안'));
    await act(async () => result.current.applyTags());
    expect(result.current.tags).toEqual(['미저장, 초안', '결제']);
    rerender({ slug: 'other-product' });
    expect(result.current.tags).toEqual(['핀테크', '결제']);
  });

  it('shows success notification on completed', () => {
    renderHook(() => useProductTagsForm({ slug: defaultSlug }));

    act(() => {
      mutationOptions.onCompleted?.({
        updateProductTags: {
          product: {
            id: 'product-1',
            tags: [{ id: 't1', name: '태그A' }],
          },
        },
      });
    });

    expect(notifications.show).toHaveBeenCalledWith({
      message: '태그 수정이 반영되었어요.',
      color: 'teal',
    });
  });

  it('handles mutation error safely without re-throwing unhandled rejection', async () => {
    mutateFn.mockRejectedValueOnce(new Error('GraphQL Tag Error'));
    const { result } = renderHook(() => useProductTagsForm({ slug: defaultSlug }));

    await expect(
      act(async () => {
        await result.current.applyTags();
      })
    ).resolves.not.toThrow();

    act(() => {
      mutationOptions.onError?.(new Error('GraphQL Tag Error'));
    });
    expect(notifications.show).toHaveBeenCalledWith({
      message: 'GraphQL Tag Error',
      color: 'red',
    });
  });

  it('prevents applyTags and removeTag when saving', async () => {
    vi.mocked(useMutation).mockImplementation((() => {
      return [mutateFn, { loading: true }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);

    const { result } = renderHook(() => useProductTagsForm({ slug: defaultSlug }));

    await act(async () => {
      await result.current.applyTags();
    });
    expect(mutateFn).not.toHaveBeenCalled();

    act(() => {
      result.current.removeTag(0);
    });
    expect(result.current.tags).toEqual(['핀테크', '결제']);
  });
});
