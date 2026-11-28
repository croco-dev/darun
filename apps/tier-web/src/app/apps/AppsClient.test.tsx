// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import type { AppListItem, fetchAppsPage } from './app-list';
import AppsClient from './AppsClient';

const { fetchPage, client } = vi.hoisted(() => ({
  fetchPage: vi.fn<typeof fetchAppsPage>(),
  client: {},
}));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => client }));
vi.mock('./app-list', async importOriginal => ({
  ...(await importOriginal<typeof import('./app-list')>()),
  fetchAppsPage: fetchPage,
}));

type Page = Awaited<ReturnType<typeof fetchAppsPage>>;

function app(id: string, name = id): AppListItem {
  return { id, name, description: null, iconUrl: null, tier: 0 };
}

function cursor(id: string, name = id) {
  return { id, name };
}

test.each(['success', 'failure'] as const)(
  '최초 교차 뒤 재교차 없이 다음 페이지를 한 번씩 열고 %s를 처리한다',
  async outcome => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    fetchPage.mockReset();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        private callback: IntersectionObserverCallback;
        constructor(callback: IntersectionObserverCallback) {
          this.callback = callback;
        }
        observe() {
          this.callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver
          );
        }
        disconnect() {}
      }
    );
    const first = Promise.withResolvers<Page>();
    const apps = (start: number, end: number) =>
      Array.from({ length: end - start + 1 }, (_, index) => app(`app-${start + index}`, `App ${start + index}`));
    const initialApps = apps(1, 24);
    const firstCursor = cursor('app-24', 'App 24');
    const secondCursor = cursor('app-48', 'App 48');
    const nextPage = {
      apps: apps(25, 48),
      totalCount: null,
      nextCursor: secondCursor,
    };
    fetchPage.mockReturnValueOnce(first.promise);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const moreButton = () => [...container.querySelectorAll('button')].find(node => node.textContent === '앱 더 보기');
    try {
      await act(async () =>
        root.render(<AppsClient initialApps={initialApps} initialTotalCount={49} initialNextCursor={firstCursor} />)
      );
      expect(fetchPage).not.toHaveBeenCalled();
      await act(async () => window.dispatchEvent(new Event('scroll')));
      expect(fetchPage).not.toHaveBeenCalled();
      expect(moreButton()).toBeDefined();
      await act(async () => {
        moreButton()!.click();
        moreButton()?.click();
      });
      expect(fetchPage).toHaveBeenLastCalledWith(client, {
        after: firstCursor,
        searchTerm: '',
      });
      expect(container.querySelector('button')?.disabled).toBe(true);
      await act(async () => window.dispatchEvent(new Event('scroll')));
      await act(async () => {
        if (outcome === 'failure') first.reject(new Error('next page failed'));
        else first.resolve(nextPage);
      });
      expect(fetchPage).toHaveBeenCalledOnce();
      if (outcome === 'failure') {
        expect(container.querySelectorAll('h3')).toHaveLength(24);
        expect(container.textContent).toContain('next page failed');
        fetchPage.mockResolvedValueOnce(nextPage);
        await act(async () => container.querySelector('button')!.click());
        expect(fetchPage).toHaveBeenCalledTimes(2);
        expect(fetchPage).toHaveBeenLastCalledWith(client, {
          after: firstCursor,
          searchTerm: '',
        });
        expect(container.textContent).not.toContain('next page failed');
      }
      expect(container.querySelectorAll('h3')).toHaveLength(48);
      expect(container.textContent).toContain('App 25');
      expect(container.textContent).toContain('총 49개 결과');
      expect(moreButton()).toBeDefined();
      fetchPage.mockResolvedValueOnce({
        apps: [app('app-24', 'Renamed app 24'), ...apps(49, 49)],
        totalCount: 49,
        nextCursor: null,
      });
      await act(async () => moreButton()!.click());
      expect(fetchPage).toHaveBeenLastCalledWith(client, {
        after: secondCursor,
        searchTerm: '',
      });
      expect(container.querySelectorAll('h3')).toHaveLength(49);
      expect(moreButton()).toBeUndefined();
      expect(container.textContent).toContain('모든 앱을 불러왔습니다.');
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
      vi.clearAllMocks();
    }
  }
);

test('clearing a pending search restores the catalog and ignores its late response', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const initialApps = [
    {
      id: 'catalog',
      name: 'Catalog app',
      description: null,
      iconUrl: null,
      tier: 0,
    },
  ];
  const { promise, resolve: completeSearch } = Promise.withResolvers<Page>();
  fetchPage.mockReturnValueOnce(promise);

  try {
    await act(async () => {
      root.render(<AppsClient initialApps={initialApps} initialTotalCount={1} initialNextCursor={null} />);
    });
    const input = container.querySelector('input')!;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the native setter is called with call(input) below.
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    const changeSearch = async (value: string) => {
      await act(async () => {
        setValue.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });
    };

    await changeSearch('late');
    expect(fetchPage).toHaveBeenCalledOnce();
    await changeSearch('');
    await act(async () => {
      completeSearch({
        apps: [app('late', 'Late search app')],
        totalCount: 1,
        nextCursor: null,
      });
    });
    expect(container.querySelector('h3')?.textContent).toBe('Catalog app');
    expect(container.textContent).not.toContain('Late search app');
  } finally {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  }
});

test.each([
  'success',
  'empty',
  'failure',
  'change-success',
  'change-failure',
  'clear-success',
  'clear-failure',
] as const)('첫 검색 실패 후 같은 검색어를 재시도한다: %s', async outcome => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fetchPage.mockReset();
  const page = (id: string): Page => ({
    apps: [app(id)],
    totalCount: 1,
    nextCursor: null,
  });
  const retry = Promise.withResolvers<Page>();
  fetchPage
    .mockRejectedValueOnce(new Error('first failure'))
    .mockReturnValueOnce(retry.promise)
    .mockResolvedValueOnce(page('new result'));
  const initialApps = [
    {
      id: 'catalog',
      name: 'Catalog app',
      description: null,
      iconUrl: null,
      tier: 0,
    },
  ];
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(<AppsClient initialApps={initialApps} initialTotalCount={1} initialNextCursor={null} />)
    );
    const input = container.querySelector('input')!;
    const search = async (value: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(async () => vi.advanceTimersByTimeAsync(250));
    };
    await search('  retry  ');
    expect(container.textContent).toContain('first failure');
    expect(container.textContent).not.toContain('검색 결과가 없습니다.');
    const button = [...container.querySelectorAll('button')].find(node => node.textContent === '다시 시도');
    expect(button).toBeDefined();
    await act(async () => {
      button!.click();
      button!.click();
    });
    expect(button!.disabled).toBe(true);
    expect(input.value).toBe('  retry  ');
    expect(fetchPage.mock.calls).toEqual([
      [client, { searchTerm: 'retry' }],
      [client, { searchTerm: 'retry' }],
    ]);
    expect(container.textContent).toContain('검색 결과를 불러오는 중입니다.');
    await act(async () => button!.click());
    expect(fetchPage).toHaveBeenCalledTimes(2);

    if (outcome.startsWith('change')) await search('new');
    if (outcome.startsWith('clear')) await search('');
    await act(async () => {
      if (outcome.endsWith('failure')) retry.reject(new Error('retry failure'));
      else if (outcome === 'empty') retry.resolve({ apps: [], totalCount: 0, nextCursor: null });
      else retry.resolve(page('retry result'));
    });

    if (outcome.startsWith('change') || outcome.startsWith('clear')) {
      expect(container.querySelector('h3')?.textContent).toBe(
        outcome.startsWith('change') ? 'new result' : 'Catalog app'
      );
      expect(container.textContent).not.toContain('retry result');
      expect(container.textContent).not.toContain('retry failure');
    } else if (outcome === 'failure') {
      expect(container.textContent).toContain('retry failure');
      expect(container.querySelector('button')?.disabled).toBe(false);
    } else if (outcome === 'empty') {
      expect(container.textContent).toContain('검색 결과가 없습니다.');
      expect(container.querySelector('button')).toBeNull();
    } else {
      expect(container.querySelector('h3')?.textContent).toBe('retry result');
      expect(container.textContent).not.toContain('first failure');
      expect(container.querySelector('button')).toBeNull();
    }
    expect(container.textContent).not.toContain('검색 결과를 불러오는 중입니다.');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  }
});

test.each(['resolve', 'reject'] as const)(
  '새 검색의 더보기가 이전 요청보다 먼저 시작되고 이전 %s가 현재 요청을 해제하지 않는다',
  async outcome => {
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    fetchPage.mockReset();
    let intersect = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersect = () =>
            callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        }
        observe() {
          intersect();
        }
        disconnect() {
          intersect = () => {};
        }
      }
    );
    const page = (id: string, hasMore = true): Page => ({
      apps: [app(id)],
      totalCount: 90,
      nextCursor: hasMore ? cursor(id) : null,
    });
    const previous = Promise.withResolvers<Page>();
    const current = Promise.withResolvers<Page>();
    fetchPage
      .mockReturnValueOnce(previous.promise)
      .mockResolvedValueOnce(page('search-first'))
      .mockReturnValueOnce(current.promise)
      .mockResolvedValueOnce(page('search-last', false));
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const initialApps = [
      {
        id: 'catalog',
        name: 'Catalog app',
        description: null,
        iconUrl: null,
        tier: 0,
      },
    ];
    const scrollAndIntersect = () => {
      window.dispatchEvent(new Event('scroll'));
      intersect();
    };
    try {
      await act(async () =>
        root.render(
          <AppsClient
            initialApps={initialApps}
            initialTotalCount={90}
            initialNextCursor={cursor('catalog', 'Catalog app')}
          />
        )
      );
      await act(async () => scrollAndIntersect());
      expect(fetchPage).toHaveBeenLastCalledWith(client, {
        after: cursor('catalog', 'Catalog app'),
        searchTerm: '',
      });
      const input = container.querySelector('input')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'search');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(async () => vi.advanceTimersByTimeAsync(250));
      expect(container.querySelector('h3')?.textContent).toBe('search-first');
      expect(container.textContent).not.toContain('다음 앱 목록을 불러오는 중입니다.');
      await act(async () => scrollAndIntersect());
      expect(fetchPage.mock.calls).toEqual([
        [client, { after: cursor('catalog', 'Catalog app'), searchTerm: '' }],
        [client, { searchTerm: 'search' }],
        [client, { after: cursor('search-first'), searchTerm: 'search' }],
      ]);
      expect(container.textContent).toContain('다음 앱 목록을 불러오는 중입니다.');
      await act(async () => {
        if (outcome === 'resolve') previous.resolve(page('stale'));
        else previous.reject(new Error('stale failure'));
      });
      expect(container.textContent).toContain('다음 앱 목록을 불러오는 중입니다.');
      expect(container.textContent).not.toContain('stale');
      await act(async () => {
        scrollAndIntersect();
        scrollAndIntersect();
      });
      expect(fetchPage).toHaveBeenCalledTimes(3);
      await act(async () => current.resolve(page('search-second')));
      expect([...container.querySelectorAll('h3')].map(node => node.textContent)).toEqual([
        'search-first',
        'search-second',
      ]);
      await act(async () => scrollAndIntersect());
      expect(fetchPage).toHaveBeenLastCalledWith(client, {
        after: cursor('search-second'),
        searchTerm: 'search',
      });
      expect([...container.querySelectorAll('h3')].map(node => node.textContent)).toEqual([
        'search-first',
        'search-second',
        'search-last',
      ]);
      expect(container.textContent).toContain('모든 앱을 불러왔습니다.');
      await act(async () => scrollAndIntersect());
      expect(fetchPage).toHaveBeenCalledTimes(4);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.useRealTimers();
      vi.unstubAllGlobals();
      vi.clearAllMocks();
    }
  }
);

test.each(['clear', 'props'] as const)('%s 뒤 새 목록의 더보기 오류를 재시도한다', async transition => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fetchPage.mockReset();
  let intersect = () => {};
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersect = () =>
          callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {
        intersect();
      }
      disconnect() {
        intersect = () => {};
      }
    }
  );
  const previous = Promise.withResolvers<Page>();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const initialApps = [app('catalog')];
  const scrollAndIntersect = () => {
    window.dispatchEvent(new Event('scroll'));
    intersect();
  };
  const search = async (value: string) => {
    await act(async () => {
      const input = container.querySelector('input')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => vi.advanceTimersByTimeAsync(250));
  };
  fetchPage
    .mockReturnValueOnce(previous.promise)
    .mockRejectedValueOnce(new Error('retry me'))
    .mockResolvedValueOnce({
      apps: [app('last')],
      totalCount: 25,
      nextCursor: null,
    });
  try {
    await act(async () =>
      root.render(<AppsClient initialApps={initialApps} initialTotalCount={48} initialNextCursor={cursor('catalog')} />)
    );
    if (transition === 'clear') {
      // 첫 검색은 진행 중으로 두고, 검색 지우기로 catalog snapshot을 복원한다.
      await search('pending');
      await search('');
    } else {
      await act(async () => scrollAndIntersect());
      await act(async () =>
        root.render(
          <AppsClient
            initialApps={[app('replacement')]}
            initialTotalCount={48}
            initialNextCursor={cursor('replacement')}
          />
        )
      );
    }
    await act(async () => scrollAndIntersect());
    expect(container.textContent).toContain('retry me');
    expect(container.textContent).not.toContain('다음 앱 목록을 불러오는 중입니다.');
    await act(async () => previous.resolve({ apps: [], totalCount: 0, nextCursor: null }));
    expect(container.textContent).toContain('retry me');
    await act(async () => container.querySelector('button')!.click());
    const after = cursor(transition === 'clear' ? 'catalog' : 'replacement');
    expect(fetchPage.mock.calls.slice(-2)).toEqual([
      [client, { after, searchTerm: '' }],
      [client, { after, searchTerm: '' }],
    ]);
    expect([...container.querySelectorAll('h3')].map(node => node.textContent)).toEqual([
      transition === 'clear' ? 'catalog' : 'replacement',
      'last',
    ]);
    expect(container.textContent).not.toContain('retry me');
    expect(container.textContent).toContain('모든 앱을 불러왔습니다.');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  }
});
