// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core';
import { MyVisualSavedFlowsDocument, MyVisualSavedScreenshotsDocument } from '@darun/provider-graphql';
import { act, createElement, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Collections } from '../features/collections/Collections';
import * as store from '../features/collections/collectionStore';
import { ProductSearchSuggest } from '../features/product-search/ProductSearchSuggest';
import { useProductSearchSuggest } from '../features/product-search/useProductSearchSuggest';
import { SavesExplorer } from '../features/saves/SavesExplorer';
import { useSavesPage } from '../features/saves/useSavesPage';
import { useVisualSaveButton } from '../features/saves/useVisualSaveButton';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import { RECORD_KEY } from './fixtures/collectionPersistence';

vi.mock('../features/collections/collectionPersistence', () => import('./fixtures/collectionPersistence'));

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  search: vi.fn(),
  mutate: vi.fn(),
  observers: new Set<(user: { id: string } | null) => void>(),
  authErrors: new Set<() => void>(),
  params: new URLSearchParams(),
  routerListeners: new Set<() => void>(),
}));
vi.mock('@apollo/client/react', () => ({
  useApolloClient: () => activeClient,
  useLazyQuery: () => [mocks.search],
}));
const client = { query: mocks.query, mutate: mocks.mutate };
let activeClient: ApolloClient | typeof client = client;
const authService = {
  onIdTokenChanged: (callback: (user: { id: string } | null) => void, onError?: () => void) => {
    mocks.observers.add(callback);
    if (onError) mocks.authErrors.add(onError);
    return () => {
      mocks.observers.delete(callback);
      if (onError) mocks.authErrors.delete(onError);
    };
  },
};
vi.mock('@darun/provider-auth/client', () => ({
  useAuthService: () => authService,
  useAuthState: () => ({ isError: false, isLoading: false }),
}));
vi.mock('@darun/utils-router', () => ({
  useSearchParams: () => useSyncExternalStore(subscribeRouter, readParams, readParams),
  useNavigate: () => navigate,
  Link: ({ children, ...props }: Record<string, unknown>) => createElement('a', props, children as never),
}));
const readParams = () => mocks.params;
const subscribeRouter = (listener: () => void) => {
  mocks.routerListeners.add(listener);
  return () => {
    mocks.routerListeners.delete(listener);
  };
};
const navigate = (url: string) => {
  mocks.params = new URLSearchParams(url.split('?')[1] ?? '');
  mocks.routerListeners.forEach(listener => listener());
};
let root: Root | undefined;
let host: HTMLDivElement;
async function mount<T>(hook: () => T) {
  let value: T;
  function Probe() {
    value = hook();
    return null;
  }
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(createElement(Probe));
  });
  return () => value!;
}
async function signIn(id: string | null) {
  await act(async () => {
    mocks.observers.forEach(callback => callback(id ? { id } : null));
  });
}
function deferred<T>() {
  return Promise.withResolvers<T>();
}
function connection(kind: 'screenshots' | 'flows', hasNextPage = false) {
  return {
    data: {
      [kind === 'screenshots' ? 'myVisualSavedScreenshots' : 'myVisualSavedFlows']: {
        edges: [],
        totalCount: 0,
        pageInfo: {
          hasNextPage,
          endCursor: hasNextPage ? `${kind}-boundary` : null,
        },
      },
    },
  };
}
beforeEach(async () => {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: async (_name: string, write: () => unknown) => write() },
  });
  await act(async () => window.dispatchEvent(new StorageEvent('storage')));
});

afterEach(async () => {
  Reflect.deleteProperty(navigator, 'locks');
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  localStorage.clear();
  mocks.params = new URLSearchParams();
  mocks.observers.clear();
  mocks.authErrors.clear();
  mocks.routerListeners.clear();
  activeClient = client;
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('saved list tabs', () => {
  it('keeps the tab and panel connected through sign-in, loading, failure and retry', async () => {
    const screens = deferred<ReturnType<typeof connection>>();
    const flows = deferred<ReturnType<typeof connection>>();
    mocks.query
      .mockReturnValueOnce(screens.promise)
      .mockReturnValueOnce(flows.promise)
      .mockResolvedValueOnce(connection('flows'));
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(SavesExplorer)));
    const [screenTab, flowTab] = host.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const screenPanel = document.getElementById(screenTab.getAttribute('aria-controls') ?? '');
    const flowPanel = document.getElementById(flowTab.getAttribute('aria-controls') ?? '');
    expect(screenTab.tabIndex).toBe(0);
    expect(flowTab.tabIndex).toBe(-1);
    expect(screenPanel?.getAttribute('role')).toBe('tabpanel');
    expect(screenPanel?.getAttribute('aria-labelledby')).toBe(screenTab.id);
    expect(flowPanel?.getAttribute('aria-labelledby')).toBe(flowTab.id);
    expect(flowPanel?.hidden).toBe(true);

    await signIn(null);
    expect(screenPanel?.textContent).toContain('Google로 로그인');
    await signIn('A');
    expect(screenPanel?.textContent).toContain('불러오는 중');
    await act(async () => screenTab.focus());
    await act(async () => screenTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
    expect(document.activeElement).toBe(flowTab);
    expect(screenTab.getAttribute('aria-selected')).toBe('true');
    expect(mocks.params.has('tab')).toBe(false);
    expect(mocks.query).toHaveBeenCalledTimes(2);

    await act(async () => flowTab.click());
    expect(mocks.params.get('tab')).toBe('flows');
    expect(document.activeElement).toBe(flowTab);
    expect(flowTab.getAttribute('aria-selected')).toBe('true');
    expect(screenPanel?.hidden).toBe(true);
    expect(flowPanel?.textContent).toContain('불러오는 중');

    await act(async () => flows.reject(new Error('flow fixture failed')));
    expect(document.activeElement).toBe(flowTab);
    const retry = flowPanel?.querySelector('button');
    expect(retry?.textContent).toBe('다시 시도');
    await act(async () => retry?.click());
    expect(flowPanel?.textContent).toContain('저장한 플로우가 없어요.');
    expect(flowTab.textContent).toContain('(0)');
    expect(document.activeElement).toBe(flowTab);
    expect(mocks.query.mock.calls.map(([request]) => request.query)).toEqual([
      MyVisualSavedScreenshotsDocument,
      MyVisualSavedFlowsDocument,
      MyVisualSavedFlowsDocument,
    ]);
  });
});

describe('saved account state', () => {
  it('ends account loading after a token failure so the login recovery control can render', async () => {
    const current = await mount(() => useSavesPage());
    expect(current().status).toBe('loading');
    await act(async () => mocks.authErrors.forEach(onError => onError()));
    expect(current().status).toBe('login-required');
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('reacts to login/logout and isolates initial tab failures and pending pages', async () => {
    const shots = deferred<ReturnType<typeof connection>>();
    mocks.query.mockImplementation(({ query, variables }) => {
      if (variables.after != null) return Promise.reject(new Error('page failed'));
      return query === MyVisualSavedScreenshotsDocument ? shots.promise : Promise.resolve(connection('flows', true));
    });
    const current = await mount(() => useSavesPage());
    await signIn(null);
    expect(current().status).toBe('login-required');
    await signIn('A');
    expect(current().status).toBe('loading');
    await act(async () => current().onTabChange('flows'));
    expect(current().status).toBe('loaded');
    await act(async () => {
      shots.reject(new Error('screenshots failed'));
    });
    expect(current().status).toBe('loaded');
    const loaded = current();
    if (loaded.status !== 'loaded') throw new Error('expected loaded');
    await act(async () => loaded.onLoadMore());
    expect(current()).toMatchObject({ status: 'loaded', loadMoreError: true });
    await act(async () => current().onTabChange('screenshots'));
    expect(current().status).toBe('error');
    await signIn(null);
    expect(current().status).toBe('login-required');
    expect(localStorage.length).toBe(0);
  });

  it('ignores old account results after another account signs in', async () => {
    const old = deferred<ReturnType<typeof connection>>();
    mocks.query.mockReturnValue(old.promise);
    const current = await mount(() => useSavesPage());
    await signIn('A');
    mocks.query.mockImplementation(({ query }) =>
      Promise.resolve(connection(query === MyVisualSavedFlowsDocument ? 'flows' : 'screenshots'))
    );
    await signIn('B');
    expect(current().status).toBe('loaded');
    await act(async () => old.reject(new Error('old account failed')));
    expect(current().status).toBe('loaded');
  });
  it('refreshes retained save buttons on login and prevents an old account mutation updating the new account', async () => {
    mocks.query.mockResolvedValue({ data: { visualScreenshotSaveStatus: { saved: false } } });
    const pending = deferred<{ data: { setVisualScreenshotSave: { saved: boolean } } }>();
    mocks.mutate.mockReturnValue(pending.promise);
    const current = await mount(() => useVisualSaveButton({ kind: 'screenshot', id: 's', enabled: true }));
    await signIn(null);
    expect(current().needsLogin).toBe(true);
    await signIn('A');
    expect(current().needsLogin).toBe(false);
    await act(async () => {
      current().toggle();
      current().toggle();
    });
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    await signIn('B');
    await act(async () => pending.resolve({ data: { setVisualScreenshotSave: { saved: true } } }));
    expect(current().saved).toBe(false);
    expect(current().isToggling).toBe(false);
  });
  it('keeps load-more loading and failure on their originating tab', async () => {
    const more = deferred<ReturnType<typeof connection>>();
    mocks.query.mockImplementation(({ query, variables }) =>
      variables.after != null
        ? more.promise
        : Promise.resolve(connection(query === MyVisualSavedFlowsDocument ? 'flows' : 'screenshots', true))
    );
    const current = await mount(() => useSavesPage());
    await signIn('A');
    const loaded = current();
    if (loaded.status !== 'loaded') throw new Error('expected loaded');
    await act(async () => loaded.onLoadMore());
    expect(current()).toMatchObject({ loadingMore: true, loadMoreError: false });
    await act(async () => current().onTabChange('flows'));
    expect(current()).toMatchObject({ loadingMore: false, loadMoreError: false });
    await act(async () => more.reject(new Error('page failed')));
    expect(current()).toMatchObject({ loadingMore: false, loadMoreError: false });
    await act(async () => current().onTabChange('screenshots'));
    expect(current()).toMatchObject({ loadingMore: false, loadMoreError: true });
  });
  it.each(['screenshots', 'flows'] as const)(
    '%s는 실패 재시도에도 같은 경계를 보내고 중복 카드를 합치지 않는다',
    async kind => {
      const card = (id: string) => ({
        id,
        imageUrl: '/fixture.svg',
        imageAlt: id,
        title: id,
        platform: 'WEB',
        flowType: 'SEARCH',
        stepCount: 1,
        coverScreenshot: { id, imageUrl: '/fixture.svg', imageAlt: id },
        product: {
          id: 'product',
          name: 'Product',
          slug: 'product',
          logoUrl: '',
          summary: '',
        },
      });
      const field = kind === 'screenshots' ? 'myVisualSavedScreenshots' : 'myVisualSavedFlows';
      let attempts = 0;
      mocks.query.mockImplementation(({ query, variables }) => {
        const target = query === MyVisualSavedScreenshotsDocument ? 'screenshots' : 'flows';
        if (target !== kind) return Promise.resolve(connection(target));
        if (variables.after) {
          expect(variables.after).toBe('stable-boundary');
          if (++attempts === 1) return Promise.reject(new Error('synthetic failure'));
          return Promise.resolve({
            data: {
              [field]: {
                totalCount: 26,
                edges: [{ node: card('s23') }, { node: card('s24') }],
                pageInfo: { hasNextPage: false, endCursor: 'last' },
              },
            },
          });
        }
        return Promise.resolve({
          data: {
            [field]: {
              totalCount: 25,
              edges: Array.from({ length: 24 }, (_, i) => ({
                node: card(`s${i}`),
              })),
              pageInfo: { hasNextPage: true, endCursor: 'stable-boundary' },
            },
          },
        });
      });
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const current = await mount(() => useSavesPage(kind));
      await signIn('A');
      const load = () => {
        const state = current();
        if (state.status !== 'loaded') throw new Error('loaded');
        return state;
      };
      await act(async () => load().onLoadMore());
      expect(load().loadMoreError).toBe(true);
      await act(async () => load().retryLoadMore());
      expect(load().loadMoreError).toBe(false);
      expect((kind === 'screenshots' ? load().screenshotCards : load().flowCards).map(card => card.id)).toEqual(
        Array.from({ length: 25 }, (_, i) => `s${i}`)
      );
      expect(load().hasNextPage).toBe(false);
      await signIn('B');
      expect(mocks.query.mock.calls.at(-1)?.[0].variables.after).toBeUndefined();
    }
  );

  it('retries only the failed tab while preserving the other tab’s in-flight page, cards, and cursor', async () => {
    const requests: Array<{
      name: string;
      variables: Record<string, unknown>;
      respond: (result: ApolloLink.Result) => void;
    }> = [];
    const apollo = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            requests.push({
              name: operation.operationName!,
              variables: operation.variables,
              respond: result => {
                observer.next(result);
                observer.complete();
              },
            });
          })
      ),
    });
    activeClient = apollo;
    const screenshots = (start: number, end: number, cursor: string | null) => ({
      data: {
        myVisualSavedScreenshots: {
          totalCount: 26,
          edges: Array.from({ length: end - start }, (_, i) => ({
            node: {
              id: `screen-${start + i}`,
              product: { id: 'product', name: 'Product', slug: 'product' },
            },
          })),
          pageInfo: { endCursor: cursor, hasNextPage: cursor !== null },
        },
      },
    });
    const flows = () => requests.filter(request => request.name === 'MyVisualSavedFlows');
    const screens = () => requests.filter(request => request.name === 'MyVisualSavedScreenshots');
    const failure = { errors: [{ message: 'Flow list unavailable' }] };
    try {
      const current = await mount(() => useSavesPage());
      const retryFlows = async () => {
        await act(async () => current().onTabChange('flows'));
        const state = current();
        if (state.status !== 'error') throw new Error('expected flows to be retryable');
        await act(async () => state.retry());
        expect(current().status).toBe('loading');
      };

      await signIn('A');
      await act(async () => {
        screens()[0]!.respond(screenshots(0, 24, 'screen-23'));
        flows()[0]!.respond(failure);
      });
      const firstPage = current();
      if (firstPage.status !== 'loaded') throw new Error('expected first screen page');
      await act(async () => firstPage.onLoadMore());
      await retryFlows();

      await act(async () => current().onTabChange('screenshots'));
      expect(current()).toMatchObject({ status: 'loaded', loadingMore: true });
      await act(async () => {
        screens()[1]!.respond(screenshots(24, 25, 'screen-24'));
        flows()[1]!.respond(failure);
      });

      await retryFlows();
      await act(async () => current().onTabChange('screenshots'));
      const retained = current();
      if (retained.status !== 'loaded') throw new Error('expected retained screen pages');
      expect(retained.screenshotCards.map(card => card.id)).toEqual(
        Array.from({ length: 25 }, (_, i) => `screen-${i}`)
      );
      expect(retained.loadingMore).toBe(false);
      await act(async () => retained.onLoadMore());
      expect(screens().map(request => request.variables)).toEqual([
        { first: 24, page: 0 },
        { first: 24, after: 'screen-23' },
        { first: 24, after: 'screen-24' },
      ]);
      expect(flows().map(request => request.variables)).toEqual(Array(3).fill({ first: 24, page: 0 }));
      await act(async () => flows()[2]!.respond(connection('flows')));
      await act(async () => current().onTabChange('flows'));
      expect(current()).toMatchObject({ status: 'loaded', flowCards: [] });
    } finally {
      await act(async () => root?.unmount());
      root = undefined;
      apollo.stop();
    }
  });

  it('uses separate real Apollo requests across account switches, including status and pagination', async () => {
    let account = 'A';
    const requests: Array<{ account: string; operation: string; after?: string; respond: () => void }> = [];
    const apollo = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            const owner = account;
            const name = operation.operationName;
            if (!name) throw new Error('Expected a named save operation');
            const after = operation.variables.after as string | undefined;
            requests.push({
              account: owner,
              operation: name,
              after,
              respond: () => {
                const field =
                  name === 'VisualScreenshotSaveStatus'
                    ? 'visualScreenshotSaveStatus'
                    : name === 'VisualFlowSaveStatus'
                      ? 'visualFlowSaveStatus'
                      : name === 'MyVisualSavedScreenshots'
                        ? 'myVisualSavedScreenshots'
                        : 'myVisualSavedFlows';
                observer.next({
                  data: {
                    [field]: name.includes('SaveStatus')
                      ? { saved: owner === 'A' }
                      : {
                          totalCount: owner === 'A' ? 9 : 2,
                          edges: [
                            {
                              node: {
                                id: `${owner}-${name}-${after ? 'next' : 'first'}`,
                                product: { id: 'product' },
                                coverScreenshot: { id: 'cover' },
                              },
                            },
                          ],
                          pageInfo: {
                            hasNextPage: true,
                            endCursor: `${owner}-${name}-${after ? 'second' : 'first'}-boundary`,
                          },
                        },
                  },
                });
                observer.complete();
              },
            });
          })
      ),
    });
    activeClient = apollo;
    try {
      const current = await mount(() => ({
        page: useSavesPage(),
        screenshot: useVisualSaveButton({ kind: 'screenshot', id: 's', enabled: true }),
        flow: useVisualSaveButton({ kind: 'flow', id: 'f', enabled: true }),
      }));
      await signIn('A');
      expect(requests.filter(request => request.account === 'A')).toHaveLength(4);
      account = 'B';
      await signIn('B');
      expect(requests.filter(request => request.account === 'B')).toHaveLength(4);
      await act(async () => requests.filter(request => request.account === 'A').forEach(request => request.respond()));
      expect(current().page.status).toBe('loading');
      expect(current().screenshot.saved).toBe(false);
      await act(async () => current().page.onTabChange('flows'));
      expect(current().page.status).toBe('loading');
      expect(current().flow.saved).toBe(false);
      await act(async () => requests.filter(request => request.account === 'B').forEach(request => request.respond()));
      expect(current().page).toMatchObject({
        status: 'loaded',
        screenshotTotalCount: 2,
        flowTotalCount: 2,
        screenshotCards: [{ id: 'B-MyVisualSavedScreenshots-first' }],
        flowCards: [{ id: 'B-MyVisualSavedFlows-first' }],
      });
      expect(current().screenshot.saved).toBe(false);
      expect(current().flow.saved).toBe(false);
      const loadMore = async () => {
        const state = current().page;
        if (state.status !== 'loaded') throw new Error('expected loaded');
        await act(async () => state.onLoadMore());
      };
      await loadMore();
      await act(async () => current().page.onTabChange('screenshots'));
      await loadMore();
      account = 'C';
      await signIn('C');
      await act(async () => requests.filter(request => request.account === 'C').forEach(request => request.respond()));
      for (const [tab, operation, cards] of [
        ['screenshots', 'MyVisualSavedScreenshots', 'screenshotCards'],
        ['flows', 'MyVisualSavedFlows', 'flowCards'],
      ] as const) {
        await act(async () => current().page.onTabChange(tab));
        await loadMore();
        const oldPage = requests.find(
          request => request.account === 'B' && request.operation === operation && request.after
        );
        const newPage = requests.find(
          request => request.account === 'C' && request.operation === operation && request.after
        );
        if (!oldPage || !newPage) throw new Error('expected pending pages for both accounts');
        expect(newPage.after).toBe(`C-${operation}-first-boundary`);
        await act(async () => oldPage.respond());
        expect(current().page).toMatchObject({
          status: 'loaded',
          loadingMore: true,
          [cards]: [{ id: `C-${operation}-first` }],
        });
        await act(async () => newPage.respond());
        expect(current().page).toMatchObject({
          status: 'loaded',
          loadingMore: false,
          [cards]: [{ id: `C-${operation}-first` }, { id: `C-${operation}-next` }],
        });
        await loadMore();
        expect(requests.at(-1)?.after).toBe(`C-${operation}-second-boundary`);
      }
    } finally {
      await act(async () => root?.unmount());
      root = undefined;
      apollo.stop();
    }
  });
});

describe.each(['screenshot', 'flow'] as const)('%s 저장 의도', kind => {
  it.each([false, true])('초기 저장 %s에서 DB commit 뒤 응답 유실을 같은 목표로 재시도한다', async initialSaved => {
    let persisted = initialSaved;
    let loseResponse = true;
    const goals: unknown[] = [];
    activeClient = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            if (operation.operationName?.includes('SaveStatus')) {
              observer.next({
                data: {
                  [kind === 'screenshot' ? 'visualScreenshotSaveStatus' : 'visualFlowSaveStatus']: { saved: persisted },
                },
              });
              observer.complete();
              return;
            }
            const goal = operation.variables.input?.saved;
            goals.push(goal);
            persisted = typeof goal === 'boolean' ? goal : !persisted;
            if (loseResponse) {
              loseResponse = false;
              observer.error(new Error('response lost after commit'));
              return;
            }
            observer.next({
              data: {
                [kind === 'screenshot' ? 'setVisualScreenshotSave' : 'setVisualFlowSave']: { saved: persisted },
              },
            });
            observer.complete();
          })
      ),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const current = await mount(() => useVisualSaveButton({ kind, id: 'target', enabled: true }));
    await signIn('A');
    await act(async () => current().toggle());
    expect(persisted).toBe(!initialSaved);
    expect(current().toggleError).toBe(true);
    await act(async () => current().retry());
    expect(persisted).toBe(!initialSaved);
    expect(goals).toEqual([!initialSaved, !initialSaved]);
    expect(current()).toMatchObject({
      saved: !initialSaved,
      toggleError: false,
      isToggling: false,
    });
    await act(async () => current().toggle());
    expect(persisted).toBe(initialSaved);
    expect(goals).toEqual([!initialSaved, !initialSaved, initialSaved]);
    (activeClient as ApolloClient).stop();
  });

  it('대상이 바뀌면 실패한 저장 목표를 버리고 새 대상 상태로 조작한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.query.mockImplementation(({ variables }) =>
      Promise.resolve({
        data: {
          [kind === 'screenshot' ? 'visualScreenshotSaveStatus' : 'visualFlowSaveStatus']: {
            saved: variables.id === 'new',
          },
        },
      })
    );
    mocks.mutate.mockRejectedValueOnce(new Error('old response lost')).mockResolvedValue({
      data: { [kind === 'screenshot' ? 'setVisualScreenshotSave' : 'setVisualFlowSave']: { saved: false } },
    });
    const current = await mount(() => {
      const [id, setId] = useState('old');
      return { ...useVisualSaveButton({ kind, id, enabled: true }), setId };
    });
    await signIn('A');
    await act(async () => current().toggle());
    expect(current().toggleError).toBe(true);
    await act(async () => current().setId('new'));
    expect(current()).toMatchObject({ saved: true, toggleError: false });
    await act(async () => current().toggle());
    expect(mocks.mutate.mock.lastCall?.[0].variables).toEqual({ input: { id: 'new', saved: false } });
    expect(current().saved).toBe(false);
  });

  it('초기 조회 전에는 저장하지 않고 확인한 상태에서 목표를 정한다', async () => {
    const status = deferred<{ data: Record<string, { saved: boolean }> }>();
    mocks.query.mockReturnValue(status.promise);
    mocks.mutate.mockResolvedValue({
      data: {
        [kind === 'screenshot' ? 'setVisualScreenshotSave' : 'setVisualFlowSave']: { saved: true },
      },
    });
    const current = await mount(() => useVisualSaveButton({ kind, id: 'target', enabled: true }));
    await signIn('A');
    await act(async () => current().toggle());
    expect(mocks.mutate).not.toHaveBeenCalled();
    await act(async () =>
      status.resolve({
        data: {
          [kind === 'screenshot' ? 'visualScreenshotSaveStatus' : 'visualFlowSaveStatus']: { saved: false },
        },
      })
    );
    await act(async () => current().toggle());
    expect(current().saved).toBe(true);
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });
});

describe('suggestion request timing', () => {
  it('invalidates an in-flight request immediately on new input, before its debounce', async () => {
    vi.useFakeTimers();
    const old = deferred<{
      data: { searchProducts: Array<{ id: string; name: string; slug: string; logoUrl: string }> };
    }>();
    mocks.search.mockReturnValueOnce(old.promise).mockResolvedValue({ data: { searchProducts: [] } });
    const current = await mount(() => useProductSearchSuggest());
    await act(async () => current().suggest('old'));
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => current().suggest('new'));
    await act(async () =>
      old.resolve({ data: { searchProducts: [{ id: 'old', name: 'Old', slug: 'old', logoUrl: '' }] } })
    );
    expect(current().suggestions).toEqual([]);
    expect(current().isSearching).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(current().isSearching).toBe(false);
    await act(async () => current().suggest(''));
    expect(current().suggestions).toEqual([]);
  });
  it('connects the active keyboard option to the input and clears it when options close', async () => {
    const suggestion = { id: 'p', name: 'Product', slug: 'product', logoUrl: '' };
    function Search({ open }: { open: boolean }) {
      const inputRef = useRef<HTMLInputElement>(null);
      return createElement(
        'div',
        null,
        createElement('input', { id: 'search', ref: inputRef }),
        createElement(ProductSearchSuggest, {
          inputId: 'search',
          inputRef,
          inputValue: 'p',
          suggestions: open ? [suggestion] : [],
          isSearching: false,
          onSelect: vi.fn(),
          onClose: vi.fn(),
        })
      );
    }
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(Search, { open: true })));
    const input = host.querySelector('input')!;
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(input.getAttribute('aria-activedescendant')).toBe(host.querySelector('[role=option]')?.id);
    await act(async () => root!.render(createElement(Search, { open: false })));
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
  });
});

it('preserves partially readable collections rather than persisting a filtered subset', async () => {
  const raw = JSON.stringify([
    {
      id: 'c',
      name: 'Mixed',
      createdAt: 1,
      items: [
        { kind: 'screenshot', id: 's', title: 'Valid', imageUrl: '/a.png', href: '/screenshots/s', productName: 'App' },
        {
          kind: 'screenshot',
          id: 'bad',
          title: 'Unsafe',
          imageUrl: '/a.png',
          href: 'javascript:alert(1)',
          productName: 'App',
        },
      ],
    },
  ]);
  localStorage.setItem('darun-visual-collections-v1', raw);
  expect(await store.createCollection('New')).toBeNull();
  expect(await store.savedIn('screenshot', 's')).toHaveLength(1);
  await store.addToCollection('c', {
    kind: 'screenshot',
    id: 's',
    title: 'Valid',
    imageUrl: '/a.png',
    href: '/screenshots/s',
    productName: 'App',
  });
  expect(await store.deleteCollection('c')).toBe('failed');
  expect(localStorage.getItem('darun-visual-collections-v1')).toBe(raw);
});

const KEY = 'darun-visual-collections-v1';
const item: store.SavedItem = {
  kind: 'screenshot',
  id: 's',
  title: 'Screen',
  imageUrl: '/a.png',
  href: '/screenshots/s',
  productName: 'App',
};
function deferCollectionWrites() {
  const release = deferred<void>();
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: async (_name: string, write: () => unknown) => {
        await release.promise;
        return write();
      },
    },
  });
  return release;
}

describe('browser collection write boundaries', () => {
  async function renderCollections(collections: store.NamedCollection[]) {
    localStorage.setItem(KEY, JSON.stringify(collections));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(Collections)));
  }

  it.each([
    ['First', 'Middle'],
    ['Middle', 'Last'],
    ['Last', 'Middle'],
  ])('focuses the neighboring removal button after removing %s', async (removed, expected) => {
    const items = ['First', 'Middle', 'Last'].map(title => ({
      ...item,
      id: title,
      title,
    }));
    await renderCollections([{ id: 'c', name: 'Collection', createdAt: 1, items }]);
    const removeButton = (title: string) =>
      host.querySelector<HTMLButtonElement>(`button[aria-label="${title} 항목을 컬렉션에서 제거"]`)!;
    const trigger = removeButton(removed);

    trigger.focus();
    await act(async () => trigger.click());

    expect(trigger.isConnected).toBe(false);
    expect(document.activeElement).toBe(removeButton(expected));
    expect(host.querySelector('[role=status]')?.textContent).toContain(`${removed} 항목을 컬렉션에서 제거했습니다.`);
  });

  it('focuses the same collection heading when its final item is removed', async () => {
    await renderCollections([
      { id: 'c', name: 'Collection', createdAt: 1, items: [item] },
      {
        id: 'other',
        name: 'Other collection',
        createdAt: 2,
        items: [{ ...item, id: 'other', title: 'Other' }],
      },
    ]);
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Screen 항목을 컬렉션에서 제거"]')!;
    trigger.focus();
    await act(async () => trigger.click());

    expect(trigger.isConnected).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('#collection-c'));
    expect(host.querySelector('#collection-c')?.closest('section')?.textContent).toContain('저장한 항목이 없습니다.');
  });

  it.each(['body', 'main'])('restores focus after a pointer removal with focus on %s', async focusedElement => {
    const retained = { ...item, id: 'retained', title: 'Retained' };
    await renderCollections([{ id: 'c', name: 'Collection', createdAt: 1, items: [item, retained] }]);
    const main = document.createElement('main');
    main.tabIndex = -1;
    host.before(main);
    main.append(host);
    if (focusedElement === 'main') main.focus();
    expect(document.activeElement).toBe(focusedElement === 'main' ? main : document.body);

    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Screen 항목을 컬렉션에서 제거"]')!;
    await act(async () => trigger.click());

    expect(trigger.isConnected).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('button[aria-label="Retained 항목을 컬렉션에서 제거"]'));
  });

  it('focuses a newly added item when removal was waiting for the storage lock', async () => {
    const added = { ...item, id: 'added', title: 'Added' };
    const collection = { id: 'c', name: 'Collection', createdAt: 1, items: [item] };
    await renderCollections([collection]);
    const release = deferCollectionWrites();
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Screen 항목을 컬렉션에서 제거"]')!;
    trigger.focus();
    await act(async () => trigger.click());

    localStorage.setItem(KEY, JSON.stringify([{ ...collection, items: [item, added] }]));
    await act(async () => release.resolve());

    expect(trigger.isConnected).toBe(false);
    const next = host.querySelector('button[aria-label="Added 항목을 컬렉션에서 제거"]');
    expect(next).not.toBeNull();
    expect(document.activeElement).toBe(next);
  });

  it('continues focus restoration when a second pending pointer removal removes the focused row', async () => {
    const second = { ...item, id: 'second', title: 'Second' };
    const third = { ...item, id: 'third', title: 'Third' };
    await renderCollections([{ id: 'c', name: 'Collection', createdAt: 1, items: [item, second, third] }]);
    const main = document.createElement('main');
    main.tabIndex = -1;
    host.before(main);
    main.append(host);
    main.focus();

    const writes = [deferred<void>(), deferred<void>()];
    let nextWrite = 0;
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: async (_name: string, write: () => unknown) => {
          await writes[nextWrite++].promise;
          return write();
        },
      },
    });
    const button = (title: string) =>
      host.querySelector<HTMLButtonElement>(`button[aria-label="${title} 항목을 컬렉션에서 제거"]`)!;
    const firstRemoval = button('Screen');
    const secondRemoval = button('Second');
    await act(async () => {
      firstRemoval.click();
      secondRemoval.click();
    });

    await act(async () => writes[0].resolve());
    expect(document.activeElement).toBe(secondRemoval);
    await act(async () => writes[1].resolve());
    expect(document.activeElement).toBe(button('Third'));
  });

  it('focuses the next collection heading after confirming deletion of a populated collection', async () => {
    await renderCollections([
      { id: 'previous', name: 'Previous collection', createdAt: 1, items: [] },
      { id: 'c', name: 'Collection', createdAt: 2, items: [item] },
      { id: 'next', name: 'Next collection', createdAt: 3, items: [] },
    ]);
    const section = host.querySelector('#collection-c')!.closest('section')!;
    const buttonWithText = (text: string) =>
      [...section.querySelectorAll('button')].find(button => button.textContent === text)!;
    await act(async () => buttonWithText('컬렉션 삭제').click());
    const confirm = buttonWithText('삭제 확인');
    confirm.focus();
    await act(async () => confirm.click());

    expect(section.isConnected).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('#collection-next'));
    expect(host.querySelector('[role=status]')?.textContent).toContain('Collection 컬렉션을 삭제했습니다.');
  });

  it('focuses the previous collection heading when deleting the last of two collections', async () => {
    await renderCollections([
      { id: 'first', name: 'First collection', createdAt: 1, items: [] },
      { id: 'last', name: 'Last collection', createdAt: 2, items: [] },
    ]);
    const section = host.querySelector('#collection-last')!.closest('section')!;
    const trigger = section.querySelector('button')!;
    trigger.focus();
    await act(async () => trigger.click());

    expect(section.isConnected).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('#collection-first'));
  });

  it('focuses a newly created collection when deletion was waiting for the storage lock', async () => {
    const collection = { id: 'c', name: 'Collection', createdAt: 1, items: [] };
    await renderCollections([collection]);
    const release = deferCollectionWrites();
    const trigger = host.querySelector<HTMLElement>('#collection-c')!.closest('section')!.querySelector('button')!;
    trigger.focus();
    await act(async () => trigger.click());

    localStorage.setItem(
      KEY,
      JSON.stringify([collection, { id: 'added', name: 'Added collection', createdAt: 2, items: [] }])
    );
    await act(async () => release.resolve());

    expect(trigger.isConnected).toBe(false);
    const next = host.querySelector('#collection-added');
    expect(next).not.toBeNull();
    expect(document.activeElement).toBe(next);
  });

  it('keeps the removal button and focus when removing an item fails', async () => {
    await renderCollections([{ id: 'c', name: 'Collection', createdAt: 1, items: [item] }]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Screen 항목을 컬렉션에서 제거"]')!;
    trigger.focus();
    await act(async () => trigger.click());

    expect(trigger.isConnected).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(host.querySelector('[role=status]')?.textContent).toBe('');
    expect(host.querySelector('[role=alert]')?.textContent).toContain('저장하지 못했습니다');
  });

  it.each(['{broken', '', '{"version":99,"collections":[]}', '[{"id":"broken"}]'])(
    'preserves raw corrupt value across all mutations: %s',
    async raw => {
      localStorage.setItem(KEY, raw);
      expect(await store.createCollection('New')).toBeNull();
      expect(await store.deleteCollection('c')).toBe('failed');
      await store.addToCollection('c', item);
      expect(await store.removeFromCollection('c', 'screenshot', 's')).toBe(false);
      expect(localStorage.getItem(KEY)).toBe(raw);
    }
  );
  it('allows valid storage edits and keeps the persisted value when writing fails', async () => {
    localStorage.removeItem(KEY);
    const collection = await store.createCollection('Valid');
    expect(collection).not.toBeNull();
    await store.addToCollection(collection!.id, item);
    const raw = localStorage.getItem(RECORD_KEY);
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(await store.deleteCollection(collection!.id)).toBe('failed');
    expect(localStorage.getItem(RECORD_KEY)).toBe(raw);
    set.mockRestore();
  });
  it('restores focus and announces successful collection deletion', async () => {
    localStorage.removeItem(KEY);
    await store.createCollection('Delete me');
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(Collections)));
    const button = [...host.querySelectorAll('button')].find(button => button.textContent === '컬렉션 삭제')!;
    button.focus();
    await act(async () => button.click());
    expect(document.activeElement?.getAttribute('aria-label')).toBe('새 컬렉션 이름');
    expect(host.querySelector('[role=status]')?.textContent).toContain('Delete me 컬렉션을 삭제했습니다.');
  });
  it('asks for confirmation when a collection gains an item while empty deletion waits for the lock', async () => {
    const raw = [{ id: 'c', name: 'Initially empty', createdAt: 1, items: [] }];
    localStorage.setItem(KEY, JSON.stringify(raw));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(Collections)));
    const release = deferCollectionWrites();
    const button = [...host.querySelectorAll('button')].find(button => button.textContent === '컬렉션 삭제')!;
    button.focus();
    await act(async () => button.click());

    // Another tab finishes its write before this one gets the lock.
    const populated = JSON.stringify([{ ...raw[0], items: [item] }]);
    localStorage.setItem(KEY, populated);
    await act(async () => release.resolve());

    expect(localStorage.getItem(KEY)).toBe(populated);
    expect(host.querySelector('[role=status]')?.textContent).toBe('');
    expect(host.textContent).toContain('1개 항목도 함께 삭제됩니다.');
    expect(document.activeElement?.textContent).toBe('취소');
    const confirm = [...host.querySelectorAll('button')].find(button => button.textContent === '삭제 확인')!;
    await act(async () => confirm.click());
    expect(JSON.parse(localStorage.getItem(RECORD_KEY)!).collections).toEqual([]);
    expect(host.querySelector('[role=status]')?.textContent).toContain('Initially empty 컬렉션을 삭제했습니다.');
  });

  it('keeps the focus that the user moved while an item removal waits', async () => {
    const retained = { ...item, id: 'b', title: 'Retained', href: '/screenshots/b' };
    localStorage.setItem(KEY, JSON.stringify([{ id: 'c', name: 'Collection', createdAt: 1, items: [item, retained] }]));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(Collections)));
    const release = deferCollectionWrites();
    const remove = host.querySelector<HTMLButtonElement>('button[aria-label="Screen 항목을 컬렉션에서 제거"]')!;
    const next = host.querySelector<HTMLAnchorElement>('a[href="/screenshots/b"]')!;

    remove.focus();
    await act(async () => remove.click());
    next.focus();
    await act(async () => release.resolve());

    expect(remove.isConnected).toBe(false);
    expect(document.activeElement).toBe(next);
    expect(host.querySelector('[role=status]')?.textContent).toContain('Screen 항목을 컬렉션에서 제거했습니다.');
  });

  it('commits a late legacy save even when a newer legacy snapshot no longer contains it', async () => {
    const legacy = { id: 'c', name: 'Collection', createdAt: 1, items: [item] };
    const original = JSON.stringify([legacy]);
    const modern = { ...item, id: 'modern', title: 'Modern', href: '/screenshots/modern' };
    const late = { ...item, id: 'late', title: 'Late', href: '/screenshots/late' };
    localStorage.setItem(KEY, original);
    await store.addToCollection(legacy.id, modern);
    await store.removeFromCollection(legacy.id, item.kind, item.id);

    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(Collections)));
    const earlierWrite = JSON.stringify([{ ...legacy, items: [item, late] }]);
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: KEY, newValue: earlierWrite, storageArea: sessionStorage })
      );
    });
    expect(JSON.parse(localStorage.getItem(RECORD_KEY)!).collections[0].items).toEqual([modern]);

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: KEY, newValue: earlierWrite, storageArea: localStorage })
      );
    });

    expect(JSON.parse(localStorage.getItem(RECORD_KEY)!).collections[0].items).toEqual([modern, late]);
    expect(localStorage.getItem(KEY)).toBe(original);
    expect(host.textContent).toContain('Late');
    expect(host.textContent).not.toContain('Screen');
  });

  it('commits the first legacy save observed by an upgraded tab that has never edited', async () => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(Collections)));
    expect(localStorage.getItem(RECORD_KEY)).toBeNull();

    const legacy = { id: 'c', name: 'Collection', createdAt: 1, items: [item] };
    const raw = JSON.stringify([legacy]);
    await act(async () => {
      localStorage.setItem(KEY, raw);
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: raw, storageArea: localStorage }));
    });

    expect(JSON.parse(localStorage.getItem(RECORD_KEY)!).collections).toEqual([legacy]);
    localStorage.removeItem(KEY);
    expect(await store.savedIn(item.kind, item.id)).toEqual([legacy]);
  });

  it('keeps a legacy value read before waiting for the import lock', async () => {
    const legacy = { id: 'c', name: 'Collection', createdAt: 1, items: [item] };
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(Collections)));
    const release = deferCollectionWrites();

    await act(async () => {
      localStorage.setItem(KEY, JSON.stringify([legacy]));
      window.dispatchEvent(new Event('focus'));
    });
    expect(localStorage.getItem(RECORD_KEY)).toBeNull();
    await act(async () => {
      localStorage.removeItem(KEY);
      window.dispatchEvent(new Event('focus'));
    });
    expect(host.textContent).not.toContain('Screen');
    await act(async () => release.resolve());

    expect(JSON.parse(localStorage.getItem(RECORD_KEY)!).collections).toEqual([legacy]);
    expect(host.textContent).toContain('Screen');
  });

  it('keeps a failed legacy import pending without showing it as saved, then retries it', async () => {
    await store.createCollection('Modern');
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(Collections)));
    const record = localStorage.getItem(RECORD_KEY);
    const release = deferCollectionWrites();
    const raw = JSON.stringify([{ id: 'c', name: 'Legacy', createdAt: 1, items: [item] }]);

    await act(async () => {
      localStorage.setItem(KEY, raw);
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: raw, storageArea: localStorage }));
    });
    localStorage.removeItem(KEY);
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('temporary transaction failure');
    });
    await act(async () => release.resolve());
    expect(localStorage.getItem(RECORD_KEY)).toBe(record);
    expect(host.querySelector('[role=alert]')?.textContent).toContain('저장하지 못했습니다');
    expect(host.textContent).not.toContain('Screen');
    writes.mockRestore();

    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(JSON.parse(localStorage.getItem(RECORD_KEY)!).collections[1].items).toEqual([item]);
    expect(host.querySelector('[role=alert]')).toBeNull();
    expect(host.textContent).toContain('Screen');
  });

  it('does not announce deletion or move focus on a failed write', async () => {
    localStorage.removeItem(KEY);
    await store.createCollection('Keep me');
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(Collections)));
    const button = [...host.querySelectorAll('button')].find(button => button.textContent === '컬렉션 삭제')!;
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    button.focus();
    await act(async () => button.click());
    expect(document.activeElement).toBe(button);
    expect(host.querySelector('[role=status]')?.textContent).toBe('');
    expect(host.querySelector('[role=alert]')).not.toBeNull();
    set.mockRestore();
  });
});
