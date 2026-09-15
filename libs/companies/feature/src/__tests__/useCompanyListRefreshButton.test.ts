// @vitest-environment jsdom

import { useApolloClient } from '@apollo/client/react';
import { AllCompaniesOnAllCompanyListTableDocument } from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCompanyListRefreshButton } from '../CompanyListRefreshButton/useCompanyListRefreshButton';

vi.mock('@apollo/client/react', () => ({
  useApolloClient: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

describe('useCompanyListRefreshButton', () => {
  let refetchQueriesMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    refetchQueriesMock = vi.fn().mockImplementation(async options => {
      options?.onQueryUpdated?.();
      return [];
    });
    vi.mocked(useApolloClient).mockReturnValue({
      refetchQueries: refetchQueriesMock,
    } as unknown as ReturnType<typeof useApolloClient>);
  });

  it('triggers refetchQueries and shows teal notification', async () => {
    const { result } = renderHook(() => useCompanyListRefreshButton());

    expect(result.current.isRefreshing).toBe(false);

    await act(async () => {
      await result.current.refresh();
    });

    expect(refetchQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        include: [AllCompaniesOnAllCompanyListTableDocument],
      })
    );
    expect(notifications.show).toHaveBeenCalledWith({
      message: '기업 목록을 새로 불러왔어요.',
      color: 'teal',
    });
    expect(result.current.isRefreshing).toBe(false);
  });

  it('prevents concurrent duplicate refresh calls while refreshing', async () => {
    let resolveRefetch: () => void = () => {};
    refetchQueriesMock.mockReturnValue(
      new Promise(resolve => {
        resolveRefetch = () => resolve([]);
      })
    );

    const { result } = renderHook(() => useCompanyListRefreshButton());

    let firstPromise: Promise<void>;
    act(() => {
      firstPromise = result.current.refresh();
    });

    expect(result.current.isRefreshing).toBe(true);

    // Concurrent call while in-flight
    await act(async () => {
      await result.current.refresh();
    });

    expect(refetchQueriesMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefetch();
      await firstPromise;
    });

    expect(result.current.isRefreshing).toBe(false);
  });
});
