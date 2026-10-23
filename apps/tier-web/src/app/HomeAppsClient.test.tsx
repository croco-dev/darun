// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
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
