import { createClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import sitemap from './sitemap';

const fixture = vi.hoisted(() => ({
  client: undefined as unknown,
  fetch: vi.fn(),
}));
vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return fixture.client;
  },
}));
vi.mock('next/server', () => ({ connection: vi.fn() }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

const ids = [1, 3, 8, 12, 19].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const rows = ids.map(id => ({ id, updated_at: '2026-10-27T03:10:00Z' }));
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('Tier sitemap Supabase transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixture.client = createClient('http://localhost:4486', 'fixture-only', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fixture.fetch },
    });
  });

  it('reads past a server cap smaller than its requested page and includes every app once', async () => {
    fixture.fetch.mockImplementation((input: string) => {
      const params = new URL(input).searchParams;
      const cursor = params.get('id')?.replace('gt.', '');
      expect(params.get('select')).toBe('id,updated_at');
      const ordered = params.get('order') === 'id.asc' ? rows : [...rows].reverse();
      return response(ordered.filter(row => !cursor || row.id > cursor).slice(0, 2));
    });

    const entries = await sitemap();
    expect(entries.filter(entry => entry.url.includes('/apps/')).map(entry => entry.url.split('/').at(-1))).toEqual(
      ids
    );
    expect(fixture.fetch).toHaveBeenCalledTimes(4);
    expect(entries.find(entry => entry.url.endsWith(ids[4]))?.lastModified).toEqual(new Date('2026-10-27T03:10:00Z'));
  });

  it.each([0, 1])('rejects API failure on page %i instead of returning static or partial success', async page => {
    fixture.fetch.mockResolvedValue(response({ message: 'fixture failure', code: '42501' }, 403));
    if (page === 1) fixture.fetch.mockResolvedValueOnce(response(rows.slice(0, 2)));
    await expect(sitemap()).rejects.toThrow();
  });

  it('returns static and tier URLs for a genuinely empty catalog', async () => {
    fixture.fetch.mockResolvedValue(response([]));
    const entries = await sitemap();
    expect(entries).toHaveLength(6);
    expect(
      entries.filter(entry => entry.url.includes('?tier=')).map(entry => new URL(entry.url).searchParams.get('tier'))
    ).toEqual(['1', '2', '3', '0']);
  });

  it('rejects a page that does not advance the cursor', async () => {
    fixture.fetch.mockImplementation(() => response(rows.slice(0, 2)));
    await expect(sitemap()).rejects.toThrow(/cursor/i);
    expect(fixture.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not interpret a missing response body as an empty catalog', async () => {
    fixture.fetch.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(sitemap()).rejects.toThrow();
  });
});
