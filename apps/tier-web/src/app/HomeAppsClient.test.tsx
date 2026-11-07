// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { AppListItem } from './home-app-list';
import HomeAppsClient from './HomeAppsClient';

const { fetchPage } = vi.hoisted(() => ({ fetchPage: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('./home-app-list', () => ({ fetchHomeAppsPage: fetchPage }));

it('distinguishes initial failure from empty and retries page one', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  const root = createRoot(container);
  fetchPage.mockResolvedValue({ apps: [], totalCount: 0, hasNextPage: false });
  try {
    await act(async () =>
      root.render(
        <HomeAppsClient initialApps={[]} initialTotalCount={0} initialHasNextPage={false} initialError tier={0} />
      )
    );
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).not.toContain('아직 없습니다');
    await act(async () => container.querySelector('button')!.click());
    expect(fetchPage).toHaveBeenCalledWith({}, { page: 1, tier: 0 });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('아직 없습니다');
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});

it.each(['resolve', 'reject'] as const)(
  '이전 snapshot 요청이 %s되어도 새 요청의 진행 상태와 중복 방어를 유지한다',
  async outcome => {
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
        observe() {}
        disconnect() {}
      }
    );
    const app = (id: string): AppListItem => ({
      id,
      name: id,
      description: null,
      iconUrl: null,
      tier: 1,
    });
    const page = (id: string, hasNextPage = true) => ({
      apps: [app(id)],
      totalCount: 4,
      hasNextPage,
    });
    const previous = Promise.withResolvers<ReturnType<typeof page>>();
    const current = Promise.withResolvers<ReturnType<typeof page>>();
    fetchPage
      .mockReturnValueOnce(previous.promise)
      .mockReturnValueOnce(current.promise)
      .mockResolvedValueOnce(page('third', false));
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const render = async (id: string) => {
      await act(async () =>
        root.render(<HomeAppsClient initialApps={[app(id)]} initialTotalCount={4} initialHasNextPage tier={1} />)
      );
    };
    const button = () => container.querySelector('button')!;
    const scrollAndIntersect = () => {
      window.dispatchEvent(new Event('scroll'));
      intersect();
    };

    try {
      await render('previous-first');
      await act(async () => button().click());
      await render('current-first');
      await act(async () => button().click());
      expect(button().disabled).toBe(true);

      await act(async () => {
        if (outcome === 'resolve') previous.resolve(page('stale'));
        else previous.reject(new Error('previous request failed'));
      });
      expect(button().disabled).toBe(true);
      expect(container.textContent).toContain('다음 앱 목록을 불러오는 중입니다.');
      expect(container.textContent).not.toContain('다시 시도');
      await act(async () => {
        button().click();
        scrollAndIntersect();
        scrollAndIntersect();
      });
      expect(fetchPage.mock.calls.map(([, args]) => args)).toEqual([
        { page: 2, tier: 1 },
        { page: 2, tier: 1 },
      ]);

      await act(async () => current.resolve(page('current-second')));
      expect([...container.querySelectorAll('h3')].map(node => node.textContent)).toEqual([
        'current-first',
        'current-second',
      ]);
      expect(button().disabled).toBe(false);
      await act(async () => scrollAndIntersect());
      expect(fetchPage).toHaveBeenLastCalledWith({}, { page: 3, tier: 1 });
      expect([...container.querySelectorAll('h3')].map(node => node.textContent)).toEqual([
        'current-first',
        'current-second',
        'third',
      ]);
      expect(container.textContent).toContain('모든 앱을 불러왔습니다.');
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
      vi.clearAllMocks();
    }
  }
);
