// @vitest-environment jsdom

import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useAllCompanyListTable } from '../AllCompanyListTable/useAllCompanyListTable';
import { useCompanyListRefreshButton } from '../CompanyListRefreshButton/useCompanyListRefreshButton';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.clearAllMocks();
});

function setup() {
  const pages: number[] = [];
  const pending: Array<{ succeed: (name: string) => void; fail: () => void }> = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const page = operation.variables.page as number;
          pages.push(page);
          const succeed = (name: string) => {
            observer.next({
              data: {
                allCompanies: {
                  totalCount: 150,
                  totalPages: 3,
                  companies: [{ id: `company-${page}`, name, type: '법인', address: '서울', startAt: null }],
                },
              },
            });
            observer.complete();
          };
          if (pages.length <= 2) succeed(`기존 기업 ${page}`);
          else pending.push({ succeed, fail: () => observer.error(new Error('Network error')) });
        })
    ),
  });
  clients.push(client);
  const hook = renderHook(() => ({ list: useAllCompanyListTable(), refresh: useCompanyListRefreshButton() }), {
    wrapper: ({ children }: { children: ReactNode }) => createElement(ApolloProvider, { client, children }),
  });
  return { ...hook, pages, pending };
}

async function openThirdPage(fixture: ReturnType<typeof setup>) {
  await waitFor(() => expect(fixture.result.current.list.companies?.[0]?.name).toBe('기존 기업 1'));
  act(() => fixture.result.current.list.handlePage(3));
  await waitFor(() => expect(fixture.result.current.list.companies?.[0]?.name).toBe('기존 기업 3'));
}

describe('useCompanyListRefreshButton with the active Apollo list', () => {
  it('awaits one current-page request, prevents another click while pending, then exposes the new rows and one success', async () => {
    const fixture = setup();
    await openThirdPage(fixture);

    let refresh!: Promise<void>;
    act(() => {
      refresh = fixture.result.current.refresh.refresh();
    });
    await waitFor(() => expect(fixture.pages).toEqual([1, 3, 3]));
    expect(fixture.result.current.refresh.isRefreshing).toBe(true);
    expect(fixture.result.current.list.companies?.[0]?.name).toBe('기존 기업 3');
    expect(notifications.show).not.toHaveBeenCalled();

    await act(async () => {
      await fixture.result.current.refresh.refresh();
    });
    expect(fixture.pages).toEqual([1, 3, 3]);

    await act(async () => {
      fixture.pending.shift()!.succeed('갱신된 기업');
      await refresh;
    });
    await waitFor(() => expect(fixture.result.current.list.companies?.[0]?.name).toBe('갱신된 기업'));
    expect(fixture.result.current.list.page).toBe(3);
    expect(fixture.result.current.refresh.isRefreshing).toBe(false);
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith({
      message: '기업 목록을 새로 불러왔어요.',
      color: 'teal',
    });
  });

  it('reports a failed request without success and can retry the same page', async () => {
    const fixture = setup();
    await openThirdPage(fixture);

    let refresh!: Promise<void>;
    act(() => {
      refresh = fixture.result.current.refresh.refresh();
    });
    await waitFor(() => expect(fixture.pages).toEqual([1, 3, 3]));
    expect(notifications.show).not.toHaveBeenCalled();
    await act(async () => {
      fixture.pending.shift()!.fail();
      await refresh;
    });
    expect(fixture.result.current.refresh.isRefreshing).toBe(false);
    expect(fixture.result.current.list.page).toBe(3);
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith({
      title: '새로고침 실패',
      message: 'Network error',
      color: 'red',
    });
    vi.mocked(notifications.show).mockClear();

    act(() => {
      refresh = fixture.result.current.refresh.refresh();
    });
    await waitFor(() => expect(fixture.pages).toEqual([1, 3, 3, 3]));
    expect(fixture.result.current.refresh.isRefreshing).toBe(true);
    expect(notifications.show).not.toHaveBeenCalled();
    await act(async () => {
      fixture.pending.shift()!.succeed('재시도 후 기업');
      await refresh;
    });
    await waitFor(() => expect(fixture.result.current.list.companies?.[0]?.name).toBe('재시도 후 기업'));
    expect(fixture.result.current.list.page).toBe(3);
    expect(fixture.result.current.refresh.isRefreshing).toBe(false);
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith({
      message: '기업 목록을 새로 불러왔어요.',
      color: 'teal',
    });
  });
});
