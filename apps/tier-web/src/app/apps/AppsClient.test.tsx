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
  const initialApps = [{ id: 'catalog', name: 'Catalog app', description: null, iconUrl: null, tier: 0 }];
  const { promise, resolve: completeSearch } = Promise.withResolvers<{ data: unknown[]; count: number; error: null }>();
  range.mockReturnValue(promise);

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
        data: [{ id: 'late', name: 'Late search app', description: null, icon_url: null, tiers: [] }],
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
