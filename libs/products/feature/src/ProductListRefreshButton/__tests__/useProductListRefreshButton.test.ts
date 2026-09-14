import { useApolloClient } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', () => ({
  useApolloClient: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { useProductListRefreshButton } from '../useProductListRefreshButton';

describe('useProductListRefreshButton', () => {
  let refetchQueriesMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    refetchQueriesMock = vi.fn();
    vi.mocked(useApolloClient).mockReturnValue({
      refetchQueries: refetchQueriesMock,
    } as unknown as ReturnType<typeof useApolloClient>);
  });

  it('negative control: initializes with loading: false', () => {
    const { result } = renderHook(() => useProductListRefreshButton());
    expect(result.current.loading).toBe(false);
  });

  it('refetches queries and finishes successfully', async () => {
    refetchQueriesMock.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useProductListRefreshButton());

    await act(async () => {
      await result.current.refresh();
    });

    expect(refetchQueriesMock).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
  });

  it('prevents synchronous double-clicks while refresh is in-flight', async () => {
    let resolveRefetch: () => void;
    refetchQueriesMock.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRefetch = () => resolve([]);
        })
    );

    const { result } = renderHook(() => useProductListRefreshButton());

    let p1: Promise<void>;
    let p2: Promise<void>;
    act(() => {
      p1 = result.current.refresh();
      p2 = result.current.refresh();
    });

    expect(refetchQueriesMock).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveRefetch!();
      await Promise.all([p1, p2]);
    });

    expect(result.current.loading).toBe(false);
  });

  it('shows error notification and resets loading: false when refetch fails', async () => {
    refetchQueriesMock.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useProductListRefreshButton());

    await act(async () => {
      await result.current.refresh();
    });

    expect(notifications.show).toHaveBeenCalledWith({
      message: '서비스 목록을 새로 불러오지 못했습니다.',
      color: 'red',
    });
    expect(result.current.loading).toBe(false);
  });
});
