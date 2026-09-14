import { useMutation } from '@apollo/client/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', () => ({
  useMutation: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { useIndexProductButton } from '../useIndexProductButton';

describe('useIndexProductButton', () => {
  const slug = 'test-slug';
  let mutateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);
  });

  it('negative control: initializes with loading: false', () => {
    const { result } = renderHook(() => useIndexProductButton({ slug }));
    expect(result.current.loading).toBe(false);
  });

  it('calls mutation with slug on indexProduct', async () => {
    mutateFn.mockResolvedValueOnce({ data: { indexProduct: { indexed: true } } });
    const { result } = renderHook(() => useIndexProductButton({ slug }));

    await act(async () => {
      await result.current.indexProduct();
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        input: { slug },
      },
    });
  });

  it('prevents duplicate concurrent calls when loading or while request is in-flight', async () => {
    let resolveMutation: () => void;
    mutateFn.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveMutation = () => resolve({ data: { indexProduct: { indexed: true } } });
        })
    );

    const { result } = renderHook(() => useIndexProductButton({ slug }));

    let p1: Promise<void>;
    let p2: Promise<void>;
    act(() => {
      p1 = result.current.indexProduct();
      p2 = result.current.indexProduct();
    });

    expect(mutateFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutation!();
      await Promise.all([p1, p2]);
    });
  });
});
