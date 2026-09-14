import { useMutation, useQuery } from '@apollo/client/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { useProductTagsForm } from '../useProductTagsForm';

describe('useProductTagsForm', () => {
  const slug = 'test-slug';
  let mutateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();

    vi.mocked(useQuery).mockReturnValue({
      data: {
        tempProductBySlug: {
          id: 'p1',
          tags: [{ id: 't1', name: 'AI' }],
        },
      },
      loading: false,
    } as unknown as ReturnType<typeof useQuery>);

    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  it('negative control: initializes with loading: false', () => {
    const { result } = renderHook(() => useProductTagsForm({ slug }));
    expect(result.current.loading).toBe(false);
    expect(result.current.tags).toEqual(['AI']);
  });

  it('updates tags locally via updateTags', () => {
    const { result } = renderHook(() => useProductTagsForm({ slug }));

    act(() => {
      result.current.updateTags(['AI', 'Productivity']);
    });

    expect(result.current.tags).toEqual(['AI', 'Productivity']);
  });

  it('calls updateProductTags with current tags on applyTags', async () => {
    mutateFn.mockResolvedValueOnce({
      data: { updateProductTags: { product: { id: 'p1', tags: [{ id: 't1', name: 'AI' }] } } },
    });
    const { result } = renderHook(() => useProductTagsForm({ slug }));

    await act(async () => {
      await result.current.applyTags();
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        slug,
        input: { tagNames: ['AI'] },
      },
    });
  });

  it('prevents synchronous double-clicks while applyTags is in-flight', async () => {
    let resolveMutation: () => void;
    mutateFn.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveMutation = () =>
            resolve({
              data: { updateProductTags: { product: { id: 'p1' } } },
            });
        })
    );

    const { result } = renderHook(() => useProductTagsForm({ slug }));

    let p1: Promise<void>;
    let p2: Promise<void>;
    act(() => {
      p1 = result.current.applyTags();
      p2 = result.current.applyTags();
    });

    expect(mutateFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutation!();
      await Promise.all([p1, p2]);
    });
  });
});
