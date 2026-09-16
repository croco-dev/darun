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
  let mutationOptions: { onCompleted?: (data: unknown) => void; onError?: (e: Error) => void };

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
      mutationOptions = (options as { onCompleted?: (data: unknown) => void; onError?: (e: Error) => void }) || {};
      return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);
  });

  it('initializes inputValue from fetched tags and preserves comma typing', () => {
    const { result } = renderHook(() => useProductTagsForm({ slug: defaultSlug }));

    expect(result.current.inputValue).toBe('핀테크, 결제');
    expect(result.current.tags).toEqual(['핀테크', '결제']);

    // Simulate typing comma and space
    act(() => {
      result.current.handleInputChange('핀테크, 결제, ');
    });

    expect(result.current.inputValue).toBe('핀테크, 결제, ');
    expect(result.current.tags).toEqual(['핀테크', '결제']);

    // Continue typing new tag
    act(() => {
      result.current.handleInputChange('핀테크, 결제, 송금');
    });

    expect(result.current.inputValue).toBe('핀테크, 결제, 송금');
    expect(result.current.tags).toEqual(['핀테크', '결제', '송금']);
  });

  it('allows removing an individual tag via removeTag', () => {
    const { result } = renderHook(() => useProductTagsForm({ slug: defaultSlug }));

    act(() => {
      result.current.removeTag('핀테크');
    });

    expect(result.current.tags).toEqual(['결제']);
    expect(result.current.inputValue).toBe('결제');
  });

  it('submits parsed tag names via applyTags', async () => {
    const { result } = renderHook(() => useProductTagsForm({ slug: defaultSlug }));

    act(() => {
      result.current.handleInputChange(' 금융,  대출 , 은행 ');
    });

    await act(async () => {
      await result.current.applyTags();
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        slug: defaultSlug,
        input: {
          tagNames: ['금융', '대출', '은행'],
        },
      },
    });
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
      result.current.removeTag('핀테크');
    });
    expect(result.current.tags).toEqual(['핀테크', '결제']);
  });
});
