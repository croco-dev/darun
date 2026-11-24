import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { buildAppsSearchFilter, fetchAppsPage, mapAppListRow } from './app-list';

it.each([
  ['Hello, world (beta)', 'name.ilike."%Hello, world (beta)%",description.ilike."%Hello, world (beta)%"'],
  ['Say "hello"', String.raw`name.ilike."%Say \"hello\"%",description.ilike."%Say \"hello\"%"`],
  [String.raw`100%_\done`, String.raw`name.ilike."%100\\%\\_\\\\done%",description.ilike."%100\\%\\_\\\\done%"`],
])('serializes %s as one literal pattern in each OR condition', (term, expectedFilter) => {
  expect(buildAppsSearchFilter(term)).toBe(expectedFilter);
});

it('preserves assigned tier from the unique one-to-one relation and defaults absent assignments to zero', () => {
  const app = { id: 'app', name: 'Example', description: null, icon_url: null };
  expect(mapAppListRow({ ...app, tiers: { tier: 1 } }).tier).toBe(1);
  expect(mapAppListRow({ ...app, tiers: { tier: 0 } }).tier).toBe(0);
  expect(mapAppListRow({ ...app, tiers: null }).tier).toBe(0);
});

it.each(['rows', 'error'] as const)('settles %s even while the count request stalls', async outcome => {
  vi.useFakeTimers();
  const head = Promise.withResolvers<Response>();
  const client = createClient('http://localhost', 'fixture', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (_input, init) => {
        if (init?.method === 'HEAD') {
          init.signal?.addEventListener('abort', () => head.reject(new DOMException('Timed out', 'AbortError')), {
            once: true,
          });
          return head.promise;
        }
        return outcome === 'error'
          ? Response.json({ message: 'Page unavailable' }, { status: 500 })
          : Response.json([{ id: 'next', name: 'Next app', description: null, icon_url: null, tiers: null }]);
      },
    },
  });
  const onPage = vi.fn();
  const onError = vi.fn();
  const load = fetchAppsPage(client, { after: { id: 'previous', name: 'Previous app' } }).then(onPage, onError);
  try {
    await vi.advanceTimersByTimeAsync(outcome === 'error' ? 0 : 5000);
    if (outcome === 'error') {
      expect(onError).toHaveBeenCalledWith(new Error('Page unavailable'));
      expect(onPage).not.toHaveBeenCalled();
    } else {
      expect(onPage).toHaveBeenCalledWith({
        apps: [{ id: 'next', name: 'Next app', description: null, iconUrl: null, tier: 0 }],
        totalCount: null,
        nextCursor: null,
      });
      expect(onError).not.toHaveBeenCalled();
    }
  } finally {
    head.resolve(new Response(null, { headers: { 'Content-Range': '*/2' } }));
    await load;
    vi.useRealTimers();
  }
});
