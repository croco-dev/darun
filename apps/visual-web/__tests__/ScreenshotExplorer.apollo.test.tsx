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
import { FlowExplorer } from '../features/flows/FlowExplorer';
import { ScreenshotExplorer } from '../features/screenshots/ScreenshotExplorer';

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
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  clients.splice(0).forEach(client => client.stop());
});

function mount(route = '/', flow = false) {
  window.history.replaceState(null, '', route);
  const requests: Array<{ operation: string | undefined; variables: Record<string, unknown> }> = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(operation => {
      requests.push({ operation: operation.operationName, variables: { ...operation.variables } });
      return new Observable(observer => {
        if (operation.operationName === 'SearchProductsOnVisualExplorer') {
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
        } else {
          const field = operation.operationName === 'VisualFlowsOnExplorer' ? 'visualFlows' : 'visualScreenshots';
          observer.next({
            data: {
              [field]: {
                totalCount: 0,
                edges: [],
                pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
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
      <ApolloProvider client={client}>{flow ? <FlowExplorer /> : <ScreenshotExplorer />}</ApolloProvider>
    </RouteFixture>
  );
  return requests;
}

const input = () => screen.getByRole<HTMLInputElement>('searchbox', { name: '스크린샷 검색' });
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
  const requests = mount('/flows?q=기존플로우', true);
  await screen.findByText('검색 결과가 없습니다.');
  const flowInput = screen.getByRole<HTMLInputElement>('searchbox');
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
