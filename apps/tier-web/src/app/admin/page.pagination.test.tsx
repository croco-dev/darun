import { createClient } from '@supabase/supabase-js';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from './page';

const fixture = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => fixture.client,
}));
vi.mock('@/components/admin/DeleteAppButton', () => ({
  DeleteAppButton: () => null,
}));
vi.mock('@/components/admin/MemoEditor', () => ({ MemoEditor: () => null }));
vi.mock('./AdminSearchInput', () => ({ AdminSearchInput: () => null }));
vi.mock('./AppStoreScrapeForm', () => ({ AppStoreScrapeForm: () => null }));
vi.mock('./TierSelect', () => ({ TierSelect: () => null }));

const requests: { url: URL; method: string }[] = [];
const responses: Response[] = [];

function rows(count: number, data: unknown[] = []) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json',
      'content-range': `*/${count}`,
    },
  });
}

function outOfRange() {
  return new Response(
    JSON.stringify({
      code: 'PGRST103',
      message: 'Requested range not satisfiable',
    }),
    {
      status: 416,
      headers: { 'content-type': 'application/json' },
    }
  );
}

function render(page: string, query = '100%_한국 앱') {
  return AdminPage({ searchParams: Promise.resolve({ page, query }) });
}

beforeEach(() => {
  requests.length = 0;
  responses.length = 0;
  fixture.client = createClient('http://127.0.0.1:54900', 'pagination-fixture-only', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        requests.push({
          url: new URL(String(input)),
          method: init?.method ?? 'GET',
        });
        const response = responses.shift();
        if (!response) throw new Error('Unexpected fixture request');
        return response;
      },
    },
  });
});

describe('admin page range recovery through the Supabase client', () => {
  it.each([
    ['ordinary', '2'],
    ['maximum integer', '9007199254740991'],
    ['overflow', '9'.repeat(400)],
  ])('preserves the literal search when recovering an %s page to the first page', async (_label, page) => {
    responses.push(outOfRange(), rows(24));
    await expect(render(page)).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/admin?query=100%25_%ED%95%9C%EA%B5%AD+%EC%95%B1;307;',
    });
    expect(requests).toHaveLength(2);
    expect(requests[1].method).toBe('HEAD');
    expect(requests[1].url.searchParams.get('offset')).toBeNull();
    for (const { url } of requests) {
      expect(url.searchParams.get('name')).toBe('ilike.%100\\%\\_한국 앱%');
    }
    const offset = Number(requests[0].url.searchParams.get('offset'));
    expect(Number.isSafeInteger(offset)).toBe(true);
    expect(Number.isSafeInteger(offset + 24)).toBe(true);
  });

  it('uses the new count after deletion to recover an old last page', async () => {
    responses.push(outOfRange(), rows(41));
    await expect(render('4', 'Calendar')).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/admin?query=Calendar&page=2;307;',
    });
  });

  it('recovers offset equal to count without treating the successful response as an error', async () => {
    responses.push(rows(25));
    await expect(render('2')).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/admin?query=100%25_%ED%95%9C%EA%B5%AD+%EC%95%B1;307;',
    });
    expect(requests).toHaveLength(1);
  });

  it('renders a normal empty first page without recovery', async () => {
    responses.push(rows(0));
    const markup = renderToStaticMarkup(await render('1'));
    expect(markup).toContain('검색 조건에 맞는 앱이 없습니다.');
    expect(markup).toContain('페이지 1 / 1');
    expect(requests).toHaveLength(1);
  });

  it('renders a valid last page with its actual results and navigation', async () => {
    responses.push(rows(26, [{ id: 'last-app', name: 'Last app', tiers: null, memos: null }]));
    const markup = renderToStaticMarkup(await render('2', 'app'));
    expect(markup).toContain('Last app');
    expect(markup).toContain('26-26 / 26');
    expect(markup).toContain('페이지 2 / 2');
    expect(markup).toMatch(/<a aria-disabled="false"[^>]*href="\/admin\?query=app">이전<\/a>/);
    expect(requests).toHaveLength(1);
  });

  it.each(['initial', 'recovery'] as const)('preserves a general %s query failure', async phase => {
    if (phase === 'recovery') responses.push(outOfRange());
    responses.push(
      new Response(
        JSON.stringify({
          code: 'XX000',
          message: 'Fixture database unavailable',
        }),
        {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }
      )
    );
    await expect(render('2')).rejects.toThrow('Fixture database unavailable');
    expect(requests).toHaveLength(phase === 'initial' ? 1 : 2);
  });

  it('keeps an unexplained range failure when a fresh count still permits the page', async () => {
    responses.push(outOfRange(), rows(60));
    await expect(render('2')).rejects.toThrow('Requested range not satisfiable');
  });

  it('does not turn a missing recovery count into an empty result', async () => {
    responses.push(outOfRange(), new Response(null));
    await expect(render('2')).rejects.toThrow('Requested range not satisfiable');
  });

  it('does not recover a range error on the first page', async () => {
    responses.push(outOfRange());
    await expect(render('1')).rejects.toThrow('Requested range not satisfiable');
    expect(requests).toHaveLength(1);
  });
});
