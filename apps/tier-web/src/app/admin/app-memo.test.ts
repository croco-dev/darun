import { requireAdmin } from '@/utils/admin';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAppMemo } from './actions';

const fixture = vi.hoisted(() => ({ client: undefined as unknown, fetch: vi.fn() }));
vi.mock('@/utils/admin', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({ createClient: () => fixture.client }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('app memo action transport', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fixture.fetch.mockResolvedValue(new Response(null, { status: 204 }));
    fixture.client = createSupabaseClient('http://localhost:4630', 'fixture-only', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fixture.fetch },
    });
  });

  it('saves trimmed content with the app identity as conflict target in one request', async () => {
    await updateAppMemo('app-463', '  Updated memo  ');
    expect(fixture.fetch).toHaveBeenCalledTimes(1);
    const [input, init] = fixture.fetch.mock.calls[0];
    expect(new URL(input).searchParams.get('on_conflict')).toBe('app_id');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Prefer')).toContain('resolution=merge-duplicates');
    expect(JSON.parse(init.body)).toEqual({
      app_id: 'app-463',
      content: 'Updated memo',
      updated_at: expect.any(String),
    });
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith('/apps/[id]', 'page');
  });

  it('deletes by app identity without first reading a memo row', async () => {
    await updateAppMemo('app-463', ' \n ');
    expect(fixture.fetch).toHaveBeenCalledTimes(1);
    const [input, init] = fixture.fetch.mock.calls[0];
    expect(init.method).toBe('DELETE');
    expect(new URL(input).searchParams.get('app_id')).toBe('eq.app-463');
  });

  it.each(['Memo', ''])('does not report a successful write when storage fails (%j)', async content => {
    fixture.fetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'fixture write rejected', code: '42501' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    );
    await expect(updateAppMemo('app-463', content)).rejects.toThrow('fixture write rejected');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects a denied administrator before sending a memo request', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error('Unauthorized'));
    await expect(updateAppMemo('app-463', 'Memo')).rejects.toThrow('Unauthorized');
    expect(fixture.fetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
