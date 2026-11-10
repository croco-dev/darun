// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type * as RouterContextModule from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type * as SearchContextModule from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { AppExplorer } from '../features/apps/AppExplorer';
import { useAppExplorer } from '../features/apps/useAppExplorer';
import { FlowExplorer } from '../features/flows/FlowExplorer';
import { useFlowExplorer } from '../features/flows/useFlowExplorer';
import { ScreenshotExplorer } from '../features/screenshots/ScreenshotExplorer';
import { useScreenshotExplorer } from '../features/screenshots/useScreenshotExplorer';

// Supply the actual Next contexts instead of mocking the explorer, its hooks,
// the router adapter or Apollo. popstate rerenders the route boundary.
// pnpm installs distinct Next peer instances for the app and utils-router.
// Resolve the context from the adapter's instance, which is selected at runtime.
const require = createRequire(import.meta.url);
const routerRequire = createRequire(require.resolve('@darun/utils-router'));
const { AppRouterContext } = routerRequire(
  'next/dist/shared/lib/app-router-context.shared-runtime'
) as typeof RouterContextModule;
const { SearchParamsContext } = routerRequire(
  'next/dist/shared/lib/hooks-client-context.shared-runtime'
) as typeof SearchContextModule;
const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
};
const getSnapshot = () => window.location.search;
const navigate = (url: string) => {
  window.history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
const router = {
  bfcacheId: 'synthetic-route-fixture',
  push: navigate,
  replace: navigate,
  prefetch: () => {},
  back: () => window.history.back(),
  forward: () => window.history.forward(),
  refresh: () => {},
};

function RouteFixture({ children }: { children: ReactNode }) {
  const search = useSyncExternalStore(subscribe, getSnapshot);
  const params = useMemo(() => new URLSearchParams(search), [search]);
  return (
    <AppRouterContext.Provider value={router}>
      <SearchParamsContext.Provider value={params}>{children}</SearchParamsContext.Provider>
    </AppRouterContext.Provider>
  );
}

const clients: ApolloClient[] = [];
afterEach(async () => {
  vi.useRealTimers();
  cleanup();
  await act(async () => clients.splice(0).forEach(client => client.stop()));
  vi.restoreAllMocks();
});

async function mountFlowPagination() {
  window.history.replaceState(null, '', '/flows?q=A');
  const pending: Array<{
    query: string;
    succeed: () => void;
    fail: () => void;
  }> = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const query = String(operation.variables.query);
          const more = operation.variables.after != null;
          const id = `${query}-${more ? '2' : '1'}`;
          const succeed = () => {
            observer.next({
              data: {
                visualFlows: {
                  totalCount: 2,
                  edges: [
                    {
                      cursor: id,
                      node: {
                        __typename: 'ProductFlow',
                        id,
                        title: `플로 ${id}`,
                        description: '',
                        platform: 'WEB',
                        flowType: 'SIGN_UP',
                        stepCount: 1,
                        coverScreenshot: {
                          __typename: 'ProductScreenshot',
                          id: `cover-${id}`,
                          imageUrl: '/fixture.svg',
                          imageAlt: '합성 화면',
                        },
                        product: {
                          __typename: 'Product',
                          id: `product-${query}`,
                          name: `서비스 ${query}`,
                          slug: query,
                          logoUrl: '',
                        },
                      },
                    },
                  ],
                  pageInfo: { hasNextPage: !more, endCursor: id },
                },
              },
            });
            observer.complete();
          };
          if (more)
            pending.push({
              query,
              succeed,
              fail: () => observer.error(new Error(`합성 ${query} 더보기 실패`)),
            });
          else succeed();
        })
    ),
  });
  clients.push(client);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () =>
    render(
      <RouteFixture>
        <ApolloProvider client={client}>
          <FlowExplorer />
        </ApolloProvider>
      </RouteFixture>
    )
  );
  return pending;
}

async function switchFlowSearch(query: string) {
  await act(async () => navigate(`/flows?q=${query}`));
  expect(screen.getByText(`플로 ${query}-1`)).toBeTruthy();
}

it('이전 조건의 더보기 실패가 새 조건의 버튼과 오류를 바꾸지 않는다', async () => {
  const pending = await mountFlowPagination();
  expect(screen.getByText('플로 A-1')).toBeTruthy();
  const previousMore = screen.getByRole<HTMLButtonElement>('button', { name: '더 보기' });
  fireEvent.click(previousMore);
  expect(previousMore.isConnected).toBe(true);
  expect(previousMore.disabled).toBe(true);
  expect(previousMore.textContent).toBe('불러오는 중...');
  await switchFlowSearch('B');
  const currentMore = screen.getByRole<HTMLButtonElement>('button', { name: '더 보기' });
  expect(currentMore.disabled).toBe(false);
  await act(async () => pending[0].fail());
  expect(screen.queryByRole('alert')).toBeNull();
  expect(currentMore.isConnected).toBe(true);
  expect(currentMore.disabled).toBe(false);
  expect(currentMore.textContent).toBe('더 보기');
  expect(screen.queryByText('플로 A-1')).toBeNull();
});

it.each(['succeed', 'fail'] as const)('이전 조건의 %s 완료가 현재 더보기의 로딩을 끝내지 않는다', async outcome => {
  const pending = await mountFlowPagination();
  expect(screen.getByText('플로 A-1')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
  await switchFlowSearch('B');
  fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
  expect(pending.map(request => request.query)).toEqual(['A', 'B']);
  await act(async () => pending[0][outcome]());
  expect(screen.getByRole<HTMLButtonElement>('button', { name: '불러오는 중...' }).disabled).toBe(true);
  expect(screen.queryByRole('alert')).toBeNull();
  await act(async () => pending[1].succeed());
  await screen.findByText('플로 B-2');
  expect(screen.getByText('플로 B-1')).toBeTruthy();
  expect(screen.queryByText('플로 A-2')).toBeNull();
  expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull();
});

it('현재 조건의 오류는 표시하고 같은 커서로 재시도해 누적 결과를 보존한다', async () => {
  const pending = await mountFlowPagination();
  expect(screen.getByText('플로 A-1')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
  await act(async () => pending[0].fail());
  expect(screen.getByRole('alert').textContent).toContain('더 불러오지 못했어요');
  expect(screen.getByRole<HTMLButtonElement>('button', { name: '더 보기' }).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
  expect(screen.queryByRole('alert')).toBeNull();
  await act(async () => pending[1].succeed());
  await screen.findByText('플로 A-2');
  expect(screen.getByText('플로 A-1')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull();
});

function mount(
  route = '/',
  consumer: 'screenshots' | 'flows' | 'apps' = 'screenshots',
  controls?: ReactNode,
  pendingSearch?: Array<() => void>,
  catalogApps?: Array<{ id: string; name: string; slug: string }>
) {
  window.history.replaceState(null, '', route);
  const requests: Array<{
    operation: string | undefined;
    variables: Record<string, unknown>;
  }> = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(operation => {
      requests.push({
        operation: operation.operationName,
        variables: { ...operation.variables },
      });
      return new Observable(observer => {
        if (operation.operationName === 'SearchProductsOnVisualExplorer') {
          const completeSearch = () => {
            observer.next({
              data: {
                searchProducts: [
                  {
                    __typename: 'Product',
                    id: 'synthetic-7',
                    name: '합성 서비스',
                    slug: 'synthetic-service',
                    logoUrl: '',
                  },
                ],
              },
            });
            observer.complete();
          };
          if (pendingSearch) pendingSearch.push(completeSearch);
          else completeSearch();
          return;
        } else {
          const field =
            operation.operationName === 'VisualFlowsOnExplorer'
              ? 'visualFlows'
              : operation.operationName === 'VisualAppsOnCatalog'
                ? 'visualApps'
                : 'visualScreenshots';
          const apps = (catalogApps ?? []).filter(app =>
            operation.variables.productSlug
              ? app.slug === operation.variables.productSlug
              : !operation.variables.query || app.name.includes(String(operation.variables.query))
          );
          observer.next({
            data: {
              [field]: {
                totalCount: apps.length,
                edges: apps.map(app => ({
                  cursor: app.id,
                  node: {
                    __typename: 'Product',
                    ...app,
                    summary: '',
                    logoUrl: '',
                    screenshotCount: 1,
                    previewScreenshots: [
                      {
                        __typename: 'ProductScreenshot',
                        id: `screen-${app.id}`,
                        imageUrl: '/fixture.svg',
                        imageAlt: app.name,
                        title: app.name,
                        platform: 'WEB',
                        screenType: 'HOME',
                      },
                    ],
                  },
                })),
                pageInfo: {
                  hasNextPage: false,
                  hasPreviousPage: false,
                  startCursor: null,
                  endCursor: null,
                },
              },
            },
          });
        }
        observer.complete();
      });
    }),
  });
  clients.push(client);
  render(
    <RouteFixture>
      <ApolloProvider client={client}>
        {consumer === 'apps' ? <AppExplorer /> : consumer === 'flows' ? <FlowExplorer /> : <ScreenshotExplorer />}
        {controls}
      </ApolloProvider>
    </RouteFixture>
  );
  return requests;
}

const input = () => screen.getByRole<HTMLInputElement>('combobox', { name: '스크린샷 검색' });
const variables = {
  query: null,
  platform: null,
  screenType: null,
  uiElements: null,
  productSlug: null,
  first: 24,
  after: null,
};
const filterCases = [
  { label: '플랫폼', value: 'IOS', param: 'platform', variables: { platform: 'IOS' } },
  { label: '화면 유형', value: 'SIGN_IN', param: 'screenType', variables: { screenType: 'SIGN_IN' } },
  { label: 'UI 요소', value: 'BUTTON', param: 'element', variables: { uiElements: ['BUTTON'] } },
];

for (const filter of filterCases) {
  it(`${filter.label}: catalog draft survives filter navigation and submits only explicitly`, async () => {
    const requests = mount();
    await screen.findByText('검색 결과가 없습니다.');
    fireEvent.change(input(), { target: { value: '결제 화면 초안' } });
    fireEvent.change(screen.getByRole('combobox', { name: filter.label }), { target: { value: filter.value } });
    await waitFor(() => expect(requests.at(-1)?.variables).toEqual({ ...variables, ...filter.variables }));
    expect(input().value).toBe('결제 화면 초안');
    expect(window.location.pathname + window.location.search).toBe(`/?${filter.param}=${filter.value}`);
    expect(new URLSearchParams(window.location.search).has('q')).toBe(false);
    fireEvent.change(input(), { target: { value: '결제 화면 최신' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() =>
      expect(requests.at(-1)?.variables).toEqual({ ...variables, ...filter.variables, query: '결제 화면 최신' })
    );
    expect(window.location.pathname + window.location.search).toBe(
      `/?q=%EA%B2%B0%EC%A0%9C+%ED%99%94%EB%A9%B4+%EC%B5%9C%EC%8B%A0&${filter.param}=${filter.value}`
    );
    expect(input().value).toBe('결제 화면 최신');
  });

  it(`${filter.label}: removing the last individual filter preserves an unsubmitted draft`, async () => {
    mount(`/?${filter.param}=${filter.value}`);
    await screen.findByText('검색 결과가 없습니다.');
    fireEvent.change(input(), { target: { value: '돌아온 초안' } });
    fireEvent.change(screen.getByRole('combobox', { name: filter.label }), { target: { value: '' } });
    expect(window.location.search).toBe('');
    expect(input().value).toBe('돌아온 초안');
    await screen.findByText('검색 결과가 없습니다.');
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(input().value).toBe('');
    expect(window.location.search).toBe('');
  });
}

it.each(filterCases)('$label changes retain the applied query without submitting the draft', async filter => {
  const requests = mount('/?q=기존검색');
  await screen.findByText('검색 결과가 없습니다.');
  expect(input().value).toBe('기존검색');
  fireEvent.change(input(), { target: { value: '아직 미제출' } });
  fireEvent.change(screen.getByRole('combobox', { name: filter.label }), { target: { value: filter.value } });
  await waitFor(() =>
    expect(requests.at(-1)?.variables).toEqual({ ...variables, ...filter.variables, query: '기존검색' })
  );
  expect(input().value).toBe('아직 미제출');
  expect(new URLSearchParams(window.location.search).get('q')).toBe('기존검색');
});

it('actual route q changes synchronize the draft, including returning to the catalog', async () => {
  mount('/?q=기존검색');
  await screen.findByText('검색 결과가 없습니다.');
  fireEvent.change(input(), { target: { value: '아직 미제출' } });
  for (const [route, expected] of [
    ['/?q=뒤로검색', '뒤로검색'],
    ['/?q=앞으로검색&platform=WEB', '앞으로검색'],
    ['/', ''],
  ]) {
    act(() => {
      window.history.replaceState(null, '', route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(input().value).toBe(expected));
  }
});

it.each(['/', '/?platform=IOS'])('explicit reset clears the draft at %s', async route => {
  mount(route);
  await screen.findByText('검색 결과가 없습니다.');
  fireEvent.change(input(), { target: { value: '지울 초안' } });
  fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
  expect(input().value).toBe('');
  expect(window.location.pathname + window.location.search).toBe('/');
});

it.each(['/', '/?platform=IOS'])('service suggestion selection clears the draft at %s', async route => {
  const requests = mount(route);
  await screen.findByText('검색 결과가 없습니다.');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  fireEvent.change(input(), { target: { value: '합성' } });
  await act(() => vi.advanceTimersByTimeAsync(300));
  vi.useRealTimers();
  const suggestion = await screen.findByRole('option', { name: '합성 서비스' });
  fireEvent.mouseDown(suggestion);
  await waitFor(() =>
    expect(requests.at(-1)?.variables).toEqual({
      ...variables,
      platform: route === '/' ? null : 'IOS',
      productSlug: 'synthetic-service',
    })
  );
  expect(input().value).toBe('');
  expect(new URLSearchParams(window.location.search).has('q')).toBe(false);
  expect(new URLSearchParams(window.location.search).get('product')).toBe('synthetic-service');
});

it('the actual flow consumer keeps its own draft, explicit submit and reset behavior', async () => {
  const requests = mount('/flows?q=기존플로우', 'flows');
  await screen.findByText('검색 결과가 없습니다.');
  const flowInput = screen.getByRole<HTMLInputElement>('combobox', { name: '플로 검색' });
  expect(flowInput.value).toBe('기존플로우');
  fireEvent.change(flowInput, { target: { value: '결제 플로우' } });
  fireEvent.change(screen.getByRole('combobox', { name: '플랫폼' }), { target: { value: 'WEB' } });
  expect(flowInput.value).toBe('결제 플로우');
  expect(new URLSearchParams(window.location.search).get('q')).toBe('기존플로우');
  fireEvent.submit(screen.getByRole('search'));
  await waitFor(() => expect(requests.at(-1)?.variables).toMatchObject({ query: '결제 플로우', platform: 'WEB' }));
  fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
  expect(flowInput.value).toBe('');
  expect(window.location.pathname + window.location.search).toBe('/flows');
});

const searchConsumers = [
  {
    consumer: 'screenshots',
    path: '/',
    label: '스크린샷 검색',
    filters: '&platform=IOS&screenType=SIGN_IN&element=BUTTON&product=fixture-app',
    operation: 'VisualScreenshotsOnExplorer',
    expected: { platform: 'IOS', screenType: 'SIGN_IN', uiElements: ['BUTTON'], productSlug: 'fixture-app' },
  },
  {
    consumer: 'flows',
    path: '/flows',
    label: '플로 검색',
    filters: '&platform=WEB&flowType=ONBOARDING&product=fixture-app',
    operation: 'VisualFlowsOnExplorer',
    expected: { platform: 'WEB', flowType: 'ONBOARDING', productSlug: 'fixture-app' },
  },
  {
    consumer: 'apps',
    path: '/apps',
    label: '앱 검색',
    filters: '&product=fixture-app',
    operation: 'VisualAppsOnCatalog',
    expected: { productSlug: 'fixture-app' },
  },
] as const;

const suggestionConsumers = [...searchConsumers, { ...searchConsumers[0], path: '/?platform=IOS' }];

function clickSearchInput(input: HTMLInputElement) {
  act(() => {
    fireEvent.mouseDown(input);
    input.focus();
    fireEvent.mouseUp(input);
    fireEvent.click(input);
  });
}

it.each(suggestionConsumers)(
  '$consumer at $path: input clicks preserve debounce, results and refocus search',
  async ({ consumer, path, label }) => {
    const requests = mount(path, consumer, <button type="button">외부 영역</button>);
    await screen.findByText('검색 결과가 없습니다.');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const search = screen.getByLabelText<HTMLInputElement>(label);
    clickSearchInput(search);
    fireEvent.change(search, { target: { value: '합성' } });
    await act(() => vi.advanceTimersByTimeAsync(150));
    clickSearchInput(search);
    expect(screen.getByText('검색 중...')).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(screen.getByRole('option', { name: '합성 서비스' })).toBeTruthy();
    const searches = () => requests.filter(request => request.operation === 'SearchProductsOnVisualExplorer');
    expect(searches()).toHaveLength(1);
    clickSearchInput(search);
    expect(screen.getByRole('option', { name: '합성 서비스' })).toBeTruthy();
    expect(searches()).toHaveLength(1);

    const outside = screen.getByRole('button', { name: '외부 영역' });
    act(() => outside.focus());
    fireEvent.click(outside);
    expect(screen.queryByRole('listbox')).toBeNull();
    clickSearchInput(search);
    expect(screen.getByText('검색 중...')).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(screen.getByRole('option', { name: '합성 서비스' })).toBeTruthy();
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(search.value).toBe('합성');
  }
);

it.each(suggestionConsumers)(
  '$consumer at $path: input clicks keep an in-flight response and selecting navigates once',
  async ({ consumer, path, label }) => {
    const pending: Array<() => void> = [];
    mount(path, consumer, undefined, pending);
    await screen.findByText('검색 결과가 없습니다.');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const search = screen.getByLabelText<HTMLInputElement>(label);
    clickSearchInput(search);
    fireEvent.change(search, { target: { value: '합성' } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(pending).toHaveLength(1);
    clickSearchInput(search);
    await act(async () => pending[0]());
    const option = screen.getByRole('option', { name: '합성 서비스' });
    const push = vi.spyOn(window.history, 'pushState');
    await act(async () => {
      fireEvent.mouseDown(option);
      fireEvent.mouseUp(option);
      fireEvent.click(option);
    });
    expect(push).toHaveBeenCalledTimes(1);
    if (consumer === 'apps') {
      expect(window.location.pathname).toBe('/apps');
      expect(new URLSearchParams(window.location.search).get('product')).toBe('synthetic-service');
      expect(new URLSearchParams(window.location.search).has('q')).toBe(false);
    } else {
      expect(new URLSearchParams(window.location.search).get('product')).toBe('synthetic-service');
      expect(screen.getByLabelText<HTMLInputElement>(label).value).toBe('');
    }
    expect(screen.queryByRole('listbox')).toBeNull();
  }
);

it.each(searchConsumers)(
  '$consumer: a direct overlong URL makes no list request and recovers at 100 characters',
  async ({ consumer, path, label, filters, operation, expected }) => {
    const overlong = '가'.repeat(101);
    const valid = '나'.repeat(100);
    const requests = mount(`${path}?q=${overlong}${filters}&after=old-cursor`, consumer);
    await screen.findByText('검색어는 100자 이하로 입력해 주세요.');
    // Drain the actual hook effects; invalid input must not be replaced by an unfiltered request.
    await act(async () => {});
    expect(requests).toEqual([]);
    expect(screen.queryByText('검색 결과가 없습니다.')).toBeNull();
    expect(screen.queryByText(/검색 결과 0개/)).toBeNull();
    expect(screen.queryByRole('navigation', { name: '결과 페이지' })).toBeNull();
    const search = screen.getByLabelText<HTMLInputElement>(label);
    expect(search.value).toBe(overlong);
    fireEvent.change(search, { target: { value: `  ${valid}  ` } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('검색 결과가 없습니다.');
    expect(requests).toEqual([
      {
        operation,
        variables: expect.objectContaining({
          ...expected,
          ...(consumer === 'apps' ? { productSlug: null } : {}),
          query: valid,
          first: 24,
          after: null,
        }),
      },
    ]);
    expect(new URLSearchParams(window.location.search).get('q')?.trim()).toBe(valid);
    expect(new URLSearchParams(window.location.search).has('after')).toBe(false);
  }
);

it.each(searchConsumers)(
  '$consumer: submitting 101 characters never issues a list request or shows prior success',
  async ({ consumer, path, label, filters, operation }) => {
    const requests = mount(`${path}?q=기존검색${filters}`, consumer);
    await screen.findByText('검색 결과가 없습니다.');
    expect(requests.filter(request => request.operation === operation)).toHaveLength(1);
    requests.splice(0);
    fireEvent.change(screen.getByLabelText(label), { target: { value: '다'.repeat(101) } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('검색어는 100자 이하로 입력해 주세요.');
    await act(async () => {});
    expect(requests).toEqual([]);
    expect(screen.queryByText('검색 결과가 없습니다.')).toBeNull();
    expect(screen.queryByText(/검색 결과 0개/)).toBeNull();
  }
);

function RequestControls({ retry, onLoadMore }: { retry: () => void; onLoadMore?: () => void }) {
  return (
    <>
      <button onClick={retry}>fixture retry</button>
      <button onClick={onLoadMore}>fixture load more</button>
    </>
  );
}
function AppRequestControls() {
  return <RequestControls {...useAppExplorer()} />;
}
function ScreenshotRequestControls() {
  return <RequestControls {...useScreenshotExplorer()} />;
}
function FlowRequestControls() {
  return <RequestControls {...useFlowExplorer()} />;
}

it.each(searchConsumers)('$consumer: retry and pagination cannot run a rejected query', async ({ consumer, path }) => {
  const controls =
    consumer === 'apps' ? (
      <AppRequestControls />
    ) : consumer === 'flows' ? (
      <FlowRequestControls />
    ) : (
      <ScreenshotRequestControls />
    );
  const requests = mount(`${path}?q=${'가'.repeat(101)}`, consumer, controls);
  await screen.findByText('검색어는 100자 이하로 입력해 주세요.');
  fireEvent.click(screen.getByRole('button', { name: 'fixture retry' }));
  fireEvent.click(screen.getByRole('button', { name: 'fixture load more' }));
  await act(async () => {});
  expect(requests).toEqual([]);
});

it('앱 선택은 이름이 같은 다른 상품을 제외하고 새로고침·직접 검색·초기화에서 첫 페이지를 사용한다', async () => {
  const apps = [
    { id: 'synthetic-7', name: '합성 서비스', slug: 'synthetic-service' },
    { id: 'other-8', name: '합성 서비스', slug: 'another-service' },
    { id: 'extended-9', name: '합성 서비스 Plus', slug: 'extended-service' },
  ];
  const requests = mount('/apps?q=이전검색&after=old-cursor', 'apps', undefined, undefined, apps);
  await screen.findByText('검색 결과가 없습니다.');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const search = screen.getByLabelText<HTMLInputElement>('앱 검색');
  fireEvent.change(search, { target: { value: '합성' } });
  await act(() => vi.advanceTimersByTimeAsync(300));
  await act(async () => fireEvent.mouseDown(screen.getByRole('option', { name: '합성 서비스' })));
  vi.useRealTimers();
  expect(window.location.search).toBe('?product=synthetic-service');
  await screen.findByRole('link', { name: /합성 서비스\s*화면\s*1\s*개/ });
  expect(screen.getAllByRole('link', { name: /화면\s*1\s*개/ }).map(link => link.getAttribute('href'))).toEqual([
    '/apps/synthetic-service',
  ]);
  expect(requests.at(-1)).toEqual({
    operation: 'VisualAppsOnCatalog',
    variables: { first: 24, after: null, query: null, productSlug: 'synthetic-service' },
  });

  // Remount the real route/provider/hook from the selected URL, without prior local state.
  const selectedUrl = `/apps${window.location.search}`;
  cleanup();
  const restored = mount(selectedUrl, 'apps', undefined, undefined, apps);
  await screen.findByRole('link', { name: /합성 서비스\s*화면\s*1\s*개/ });
  expect(restored).toEqual([
    {
      operation: 'VisualAppsOnCatalog',
      variables: { first: 24, after: null, query: null, productSlug: 'synthetic-service' },
    },
  ]);

  await act(async () => navigate(`${selectedUrl}&after=selected-cursor`));
  fireEvent.change(screen.getByLabelText('앱 검색'), { target: { value: '  합성 서비스  ' } });
  fireEvent.submit(screen.getByRole('search'));
  await waitFor(() => expect(screen.getAllByRole('link', { name: /화면\s*1\s*개/ })).toHaveLength(3));
  expect(window.location.search).toBe('?q=%ED%95%A9%EC%84%B1+%EC%84%9C%EB%B9%84%EC%8A%A4');
  expect(restored.at(-1)).toEqual({
    operation: 'VisualAppsOnCatalog',
    variables: { first: 24, after: null, query: '합성 서비스', productSlug: null },
  });

  await act(async () => navigate(`${selectedUrl}&after=selected-cursor`));
  fireEvent.click(screen.getByRole('button', { name: '초기화' }));
  await waitFor(() => expect(screen.getAllByRole('link', { name: /화면\s*1\s*개/ })).toHaveLength(3));
  expect(window.location.search).toBe('');
  expect(screen.getByLabelText<HTMLInputElement>('앱 검색').value).toBe('');
  expect(restored.at(-1)).toEqual({
    operation: 'VisualAppsOnCatalog',
    variables: { first: 24, after: null, query: null, productSlug: null },
  });
});
