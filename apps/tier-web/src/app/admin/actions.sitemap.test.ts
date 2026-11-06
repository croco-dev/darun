import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteApp, searchAndAddApps } from './actions';

const fixture = vi.hoisted(() => ({
  client: undefined as unknown,
  fetch: vi.fn(),
  apple: vi.fn(),
}));
vi.mock('@/utils/admin', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => fixture.client,
  createAdminClient: () => fixture.client,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('app writes invalidate the sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fixture.apple);
    fixture.apple.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ trackId: 486, trackName: 'Sitemap fixture' }],
        })
      )
    );
    fixture.client = createClient('http://localhost:4486', 'fixture-only', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fixture.fetch },
    });
  });

  it.each([true, false])('invalidates after collection only when a new app was added (%s)', async added => {
    fixture.fetch.mockResolvedValue(
      new Response(JSON.stringify(added ? [{ id: 'new-app' }] : []), {
        headers: { 'content-type': 'application/json' },
      })
    );
    const form = new FormData();
    form.set('keyword', 'fixture');
    expect((await searchAndAddApps({ status: 'idle', message: '' }, form)).status).toBe('success');
    if (added) expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml');
    else expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('invalidates after deletion succeeds', async () => {
    fixture.fetch.mockResolvedValue(new Response(null, { status: 204 }));
    await deleteApp('removed-app');
    expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml');
  });

  it('keeps the cache when deletion fails', async () => {
    fixture.fetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'fixture rejected' }), {
        status: 403,
      })
    );
    await expect(deleteApp('kept-app')).rejects.toThrow();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
