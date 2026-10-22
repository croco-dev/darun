// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core';
import { MyVisualSavedFlowsDocument, MyVisualSavedScreenshotsDocument } from '@darun/provider-graphql';
import { act, createElement, useRef, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Collections } from '../features/collections/Collections';
import * as store from '../features/collections/collectionStore';
import { ProductSearchSuggest } from '../features/product-search/ProductSearchSuggest';
import { useProductSearchSuggest } from '../features/product-search/useProductSearchSuggest';
import { useSavesPage } from '../features/saves/useSavesPage';
import { useVisualSaveButton } from '../features/saves/useVisualSaveButton';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  search: vi.fn(),
  mutate: vi.fn(),
  observers: new Set<(user: { id: string } | null) => void>(),
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
  onIdTokenChanged: (callback: (user: { id: string } | null) => void) => {
    mocks.observers.add(callback);
    return () => mocks.observers.delete(callback);
  },
};
vi.mock('@darun/provider-auth/client', () => ({ useAuthService: () => authService }));
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
        pageInfo: { hasNextPage },
      },
    },
  };
}
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  localStorage.clear();
  mocks.params = new URLSearchParams();
  mocks.observers.clear();
  mocks.routerListeners.clear();
  activeClient = client;
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('saved account state', () => {
  it('reacts to login/logout and isolates initial tab failures and pending pages', async () => {
    const shots = deferred<ReturnType<typeof connection>>();
    mocks.query.mockImplementation(({ query, variables }) => {
      if (variables.page > 0) return Promise.reject(new Error('page failed'));
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
    const pending = deferred<{ data: { toggleVisualScreenshotSave: { saved: boolean } } }>();
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
    await act(async () => pending.resolve({ data: { toggleVisualScreenshotSave: { saved: true } } }));
    expect(current().saved).toBe(false);
    expect(current().isToggling).toBe(false);
  });
  it('keeps load-more loading and failure on their originating tab', async () => {
    const more = deferred<ReturnType<typeof connection>>();
    mocks.query.mockImplementation(({ query, variables }) =>
      variables.page > 0
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
  it('uses separate real Apollo requests across account switches, including status and pagination', async () => {
    let account = 'A';
    const requests: Array<{ account: string; operation: string; page: number; respond: () => void }> = [];
    const apollo = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            const owner = account;
            const name = operation.operationName;
            if (!name) throw new Error('Expected a named save operation');
            requests.push({
              account: owner,
              operation: name,
              page: operation.variables.page ?? 0,
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
                          edges: [],
                          pageInfo: { hasNextPage: true, endCursor: null },
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
      await act(async () => requests.filter(request => request.account === 'B').forEach(request => request.respond()));
      expect(current().page).toMatchObject({ status: 'loaded', screenshotTotalCount: 2, flowTotalCount: 2 });
      expect(current().screenshot.saved).toBe(false);
      expect(current().flow.saved).toBe(false);
      const bPage = current().page;
      if (bPage.status !== 'loaded') throw new Error('expected loaded');
      await act(async () => bPage.onLoadMore());
      account = 'C';
      await signIn('C');
      await act(async () => requests.filter(request => request.account === 'C').forEach(request => request.respond()));
      const cPage = current().page;
      if (cPage.status !== 'loaded') throw new Error('expected loaded');
      await act(async () => cPage.onLoadMore());
      expect(requests.filter(request => request.account === 'C' && request.page === 1)).toHaveLength(1);
      await act(async () => requests.filter(request => request.page === 1).forEach(request => request.respond()));
      expect(current().page).toMatchObject({ status: 'loaded', screenshotTotalCount: 2, loadingMore: false });
    } finally {
      await act(async () => root?.unmount());
      root = undefined;
      apollo.stop();
    }
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

it('preserves partially readable collections rather than persisting a filtered subset', () => {
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
  expect(store.createCollection('New')).toBeNull();
  expect(store.savedIn('screenshot', 's')).toHaveLength(1);
  store.toggleInCollection('c', {
    kind: 'screenshot',
    id: 's',
    title: 'Valid',
    imageUrl: '/a.png',
    href: '/screenshots/s',
    productName: 'App',
  });
  expect(store.deleteCollection('c')).toBe(false);
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
describe('browser collection write boundaries', () => {
  it.each(['{broken', '', '{"version":99,"collections":[]}', '[{"id":"broken"}]'])(
    'preserves raw corrupt value across all mutations: %s',
    raw => {
      localStorage.setItem(KEY, raw);
      expect(store.createCollection('New')).toBeNull();
      expect(store.deleteCollection('c')).toBe(false);
      store.toggleInCollection('c', item);
      expect(store.removeFromCollection('c', 'screenshot', 's')).toBe(false);
      expect(localStorage.getItem(KEY)).toBe(raw);
    }
  );
  it('allows valid storage edits and keeps the persisted value when writing fails', () => {
    localStorage.removeItem(KEY);
    const collection = store.createCollection('Valid');
    expect(collection).not.toBeNull();
    store.toggleInCollection(collection!.id, item);
    const raw = localStorage.getItem(KEY);
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(store.deleteCollection(collection!.id)).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(raw);
    set.mockRestore();
  });
  it('restores focus and announces successful collection deletion', async () => {
    localStorage.removeItem(KEY);
    store.createCollection('Delete me');
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
  it('does not announce deletion or move focus on a failed write', async () => {
    localStorage.removeItem(KEY);
    store.createCollection('Keep me');
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
