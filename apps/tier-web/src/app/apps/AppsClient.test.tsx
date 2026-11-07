// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import AppsClient from './AppsClient';

const { range } = vi.hoisted(() => ({ range: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => {
    const query = {
      select: () => query,
      order: () => query,
      or: () => query,
      overrideTypes: () => query,
      range,
    };
    return { from: () => query };
  },
}));

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
  const { promise, resolve: completeSearch } = Promise.withResolvers<{
    data: unknown[];
    count: number;
    error: null;
  }>();
  range.mockReturnValue({ overrideTypes: () => promise });

  try {
    await act(async () => {
      root.render(<AppsClient initialApps={initialApps} initialTotalCount={1} initialHasNextPage={false} />);
    });
    const input = container.querySelector('input')!;
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
    expect(range).toHaveBeenCalledOnce();
    await changeSearch('');
    await act(async () => {
      completeSearch({
        data: [
          {
            id: 'late',
            name: 'Late search app',
            description: null,
            icon_url: null,
            tiers: null,
          },
        ],
        count: 1,
        error: null,
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
  range.mockReset();
  const page = (id: string) => ({
    data: [{ id, name: id, description: null, icon_url: null, tiers: null }],
    count: 1,
    error: null,
  });
  const retry = Promise.withResolvers<ReturnType<typeof page>>();
  range
    .mockReturnValueOnce({
      overrideTypes: () =>
        Promise.resolve({
          data: [],
          count: 0,
          error: { message: 'first failure' },
        }),
    })
    .mockReturnValueOnce({ overrideTypes: () => retry.promise })
    .mockReturnValueOnce({
      overrideTypes: () => Promise.resolve(page('new result')),
    });
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
      root.render(<AppsClient initialApps={initialApps} initialTotalCount={1} initialHasNextPage={false} />)
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
    expect(range.mock.calls).toEqual([
      [0, 23],
      [0, 23],
    ]);
    expect(container.textContent).toContain('검색 결과를 불러오는 중입니다.');
    await act(async () => button!.click());
    expect(range).toHaveBeenCalledTimes(2);

    if (outcome.startsWith('change')) await search('new');
    if (outcome.startsWith('clear')) await search('');
    await act(async () => {
      if (outcome.endsWith('failure')) retry.reject(new Error('retry failure'));
      else if (outcome === 'empty') retry.resolve({ data: [], count: 0, error: null });
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
    range.mockReset();
    let intersect = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersect = () =>
            callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        }
        observe() {}
        disconnect() {
          intersect = () => {};
        }
      }
    );
    const row = (id: string) => ({
      id,
      name: id,
      description: null,
      icon_url: null,
      tiers: null,
    });
    const page = (id: string, count = 90) => ({
      data: [row(id)],
      count,
      error: null,
    });
    const previous = Promise.withResolvers<ReturnType<typeof page>>();
    const current = Promise.withResolvers<ReturnType<typeof page>>();
    range
      .mockReturnValueOnce({ overrideTypes: () => previous.promise })
      .mockReturnValueOnce({
        overrideTypes: () => Promise.resolve(page('search-first')),
      })
      .mockReturnValueOnce({ overrideTypes: () => current.promise })
      .mockReturnValueOnce({
        overrideTypes: () => Promise.resolve(page('search-last', 49)),
      });
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
        root.render(<AppsClient initialApps={initialApps} initialTotalCount={90} initialHasNextPage />)
      );
      await act(async () => scrollAndIntersect());
      expect(range).toHaveBeenLastCalledWith(24, 47);
      const input = container.querySelector('input')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'search');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(async () => vi.advanceTimersByTimeAsync(250));
      expect(container.querySelector('h3')?.textContent).toBe('search-first');
      expect(container.textContent).not.toContain('다음 앱 목록을 불러오는 중입니다.');
      await act(async () => scrollAndIntersect());
      expect(range.mock.calls).toEqual([
        [24, 47],
        [0, 23],
        [24, 47],
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
      expect(range).toHaveBeenCalledTimes(3);
      await act(async () => current.resolve(page('search-second')));
      expect([...container.querySelectorAll('h3')].map(node => node.textContent)).toEqual([
        'search-first',
        'search-second',
      ]);
      await act(async () => scrollAndIntersect());
      expect(range).toHaveBeenLastCalledWith(48, 71);
      expect([...container.querySelectorAll('h3')].map(node => node.textContent)).toEqual([
        'search-first',
        'search-second',
        'search-last',
      ]);
      expect(container.textContent).toContain('모든 앱을 불러왔습니다.');
      await act(async () => scrollAndIntersect());
      expect(range).toHaveBeenCalledTimes(4);
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
  range.mockReset();
  let intersect = () => {};
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersect = () =>
          callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {}
      disconnect() {
        intersect = () => {};
      }
    }
  );
  const previous = Promise.withResolvers<{
    data: unknown[];
    count: number;
    error: null;
  }>();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const app = (id: string) => ({
    id,
    name: id,
    description: null,
    iconUrl: null,
    tier: 0,
  });
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
  range
    .mockReturnValueOnce({ overrideTypes: () => previous.promise })
    .mockReturnValueOnce({
      overrideTypes: () =>
        Promise.resolve({
          data: [],
          count: 0,
          error: { message: 'retry me' },
        }),
    })
    .mockReturnValueOnce({
      overrideTypes: () =>
        Promise.resolve({
          data: [
            {
              id: 'last',
              name: 'last',
              description: null,
              icon_url: null,
              tiers: null,
            },
          ],
          count: 25,
          error: null,
        }),
    });
  try {
    await act(async () =>
      root.render(<AppsClient initialApps={initialApps} initialTotalCount={48} initialHasNextPage />)
    );
    if (transition === 'clear') {
      // 첫 검색은 진행 중으로 두고, 검색 지우기로 catalog snapshot을 복원한다.
      await search('pending');
      await search('');
    } else {
      await act(async () => scrollAndIntersect());
      await act(async () =>
        root.render(<AppsClient initialApps={[app('replacement')]} initialTotalCount={48} initialHasNextPage />)
      );
    }
    await act(async () => scrollAndIntersect());
    expect(container.textContent).toContain('retry me');
    expect(container.textContent).not.toContain('다음 앱 목록을 불러오는 중입니다.');
    await act(async () => previous.resolve({ data: [], count: 0, error: null }));
    expect(container.textContent).toContain('retry me');
    await act(async () => container.querySelector('button')!.click());
    expect(range.mock.calls.slice(-2)).toEqual([
      [24, 47],
      [24, 47],
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
