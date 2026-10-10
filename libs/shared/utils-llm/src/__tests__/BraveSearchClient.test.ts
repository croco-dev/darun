import { describe, expect, it, vi } from 'vitest';
import { BraveSearchClient } from '../search/BraveSearchClient';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('BraveSearchClient', () => {
  it('returns NOT_CONFIGURED when the key provider is missing or blank', async () => {
    const missingKey = await new BraveSearchClient().search('linear');
    expect(missingKey).toEqual({
      ok: false,
      code: 'NOT_CONFIGURED',
      message: 'Brave search API key is not configured',
    });

    const blankKey = await new BraveSearchClient(() => '   ').search('linear');
    expect(blankKey.ok).toBe(false);
    if (!blankKey.ok) {
      expect(blankKey.code).toBe('NOT_CONFIGURED');
    }
  });

  it('returns typed outcomes for 429 and upstream failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('limited', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const rateLimited = await new BraveSearchClient(() => 'key').search('linear');
      expect(rateLimited).toEqual({
        ok: false,
        code: 'RATE_LIMITED',
        message: 'Brave search rate limit exceeded',
      });
    } finally {
      vi.unstubAllGlobals();
    }

    const upstreamMock = vi.fn().mockResolvedValue(new Response('error', { status: 503 }));
    vi.stubGlobal('fetch', upstreamMock);
    try {
      const upstream = await new BraveSearchClient(() => 'key').search('linear');
      expect(upstream.ok).toBe(false);
      if (!upstream.ok) {
        expect(upstream.code).toBe('UPSTREAM_ERROR');
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('returns empty results for upstream success with no usable results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ web: { results: [] } }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const outcome = await new BraveSearchClient(() => 'key').search('linear');
      expect(outcome).toEqual({ ok: true, results: [] });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps only valid http(s) results and caps fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        web: {
          results: [
            { title: 'Linear', url: 'https://linear.app', description: 'Plan work', extra_snippets: ['x'] },
            { title: 'bad', url: 'ftp://example.com/file', description: 'ignored' },
            { title: '', url: 'https://example.com/empty', description: 'ignored' },
          ],
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      const outcome = await new BraveSearchClient(() => 'key').search('linear', 5);
      expect(outcome).toEqual({
        ok: true,
        results: [
          {
            title: 'Linear',
            url: 'https://linear.app',
            description: 'Plan work',
            extraSnippets: ['x'],
          },
        ],
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('maps malformed upstream JSON shape to UPSTREAM_ERROR', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ web: { results: 'nope' } }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const outcome = await new BraveSearchClient(() => 'key').search('linear');
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.code).toBe('UPSTREAM_ERROR');
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
