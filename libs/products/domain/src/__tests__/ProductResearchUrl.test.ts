import { describe, expect, it } from 'vitest';
import { isSafeSlug, normalizeOfficialUrl, suggestSlug } from '../services/ProductResearchUrl';

describe('normalizeOfficialUrl', () => {
  it('adds https, strips query/hash, and preserves path', () => {
    const result = normalizeOfficialUrl('linear.app/features?utm_source=x#top');
    expect(result).toEqual({ ok: true, url: 'https://linear.app/features', hostname: 'linear.app' });
  });

  it('rejects credentials, non-http schemes, loopback, and secret paths', () => {
    expect(normalizeOfficialUrl('https://user:pass@linear.app').ok).toBe(false);
    expect(normalizeOfficialUrl('ftp://linear.app').ok).toBe(false);
    expect(normalizeOfficialUrl('http://localhost:3000').ok).toBe(false);
    expect(normalizeOfficialUrl('http://127.0.0.1/x').ok).toBe(false);
    expect(normalizeOfficialUrl('https://linear.app/invite/abcdefghijklmnopqrstuvwxyz123456').ok).toBe(false);
  });
});

describe('suggestSlug/isSafeSlug', () => {
  it('derives ascii slugs and falls back to host labels', () => {
    expect(suggestSlug('Linear', 'linear.app')).toBe('linear');
    expect(suggestSlug('리니어', 'linear.app')).toBe('linear');
    expect(isSafeSlug('linear-app')).toBe(true);
    expect(isSafeSlug('Linear_App')).toBe(false);
  });
});
