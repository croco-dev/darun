import { describe, expect, it } from 'vitest';
import { buildSitemapEntries, SitemapProduct } from '../app/sitemap-entries';

describe('buildSitemapEntries', () => {
  const CANONICAL_ORIGIN = 'https://www.darun.io';

  it('기본 필수 경로(홈, 랭킹, 어바웃)를 ko/en 모두 포함한다', async () => {
    const entries = await buildSitemapEntries({
      fetchProducts: async () => [],
      fetchCategories: async () => [],
      fetchMagazines: async () => [],
    });

    const urls = entries.map(e => e.url);
    expect(urls).toContain(`${CANONICAL_ORIGIN}/ko`);
    expect(urls).toContain(`${CANONICAL_ORIGIN}/en`);
    expect(urls).toContain(`${CANONICAL_ORIGIN}/ko/ranking`);
    expect(urls).toContain(`${CANONICAL_ORIGIN}/en/ranking`);
    expect(urls).toContain(`${CANONICAL_ORIGIN}/ko/about`);
    expect(urls).toContain(`${CANONICAL_ORIGIN}/en/about`);
  });

  it('모든 URL이 https://www.darun.io canonical origin을 사용한다', async () => {
    const entries = await buildSitemapEntries({
      fetchProducts: async () => [
        { id: '1', slug: 'notion', publishedAt: '2026-01-01T00:00:00Z', alternatives: [{ slug: 'obsidian' }] },
      ],
      fetchCategories: async () => [{ id: 'c1', slug: 'productivity' }],
      fetchMagazines: async () => [{ id: 'm1', slug: 'tech-trends', publishedAt: '2026-01-01T00:00:00Z' }],
    });

    for (const entry of entries) {
      expect(entry.url.startsWith(CANONICAL_ORIGIN)).toBe(true);
      expect(entry.url).not.toContain('localhost');
      expect(entry.url).not.toContain('?');
      expect(entry.url).not.toContain('#');
    }
  });

  it('중복 URL이 존재하지 않는다', async () => {
    const entries = await buildSitemapEntries({
      fetchProducts: async () => [
        { id: '1', slug: 'p1', alternatives: [] },
        { id: '2', slug: 'p2', alternatives: [{ slug: 'p1' }] },
      ],
      fetchCategories: async () => [{ slug: 'cat1' }],
      fetchMagazines: async () => [{ slug: 'mag1' }],
    });

    const urls = entries.map(e => e.url);
    const uniqueUrls = new Set(urls);
    expect(urls.length).toBe(uniqueUrls.size);
  });

  it('매거진은 한국어(ko) canonical만 등록되고 영어(en) 매거진은 등록되지 않는다', async () => {
    const entries = await buildSitemapEntries({
      fetchProducts: async () => [],
      fetchCategories: async () => [],
      fetchMagazines: async () => [{ id: 'm1', slug: 'ai-landscape' }],
    });

    const urls = entries.map(e => e.url);
    expect(urls).toContain(`${CANONICAL_ORIGIN}/ko/magazines/ai-landscape`);
    expect(urls).not.toContain(`${CANONICAL_ORIGIN}/en/magazines/ai-landscape`);
    expect(urls.some(u => u.includes('/en/magazines/'))).toBe(false);
  });

  it('대안(alternatives) 경로에는 대안이 존재하는 상품만 포함된다', async () => {
    const entries = await buildSitemapEntries({
      fetchProducts: async () => [
        { id: '1', slug: 'with-alt', alternatives: [{ slug: 'alt-1' }] },
        { id: '2', slug: 'no-alt', alternatives: [] },
        { id: '3', slug: 'null-alt', alternatives: null },
      ],
      fetchCategories: async () => [],
      fetchMagazines: async () => [],
    });

    const urls = entries.map(e => e.url);
    expect(urls).toContain(`${CANONICAL_ORIGIN}/ko/products/with-alt/alternatives`);
    expect(urls).toContain(`${CANONICAL_ORIGIN}/en/products/with-alt/alternatives`);
    expect(urls).not.toContain(`${CANONICAL_ORIGIN}/ko/products/no-alt/alternatives`);
    expect(urls).not.toContain(`${CANONICAL_ORIGIN}/en/products/no-alt/alternatives`);
    expect(urls).not.toContain(`${CANONICAL_ORIGIN}/ko/products/null-alt/alternatives`);
    expect(urls).not.toContain(`${CANONICAL_ORIGIN}/en/products/null-alt/alternatives`);
  });

  it('내부 검색 URL이나 비교 URL, .md URL이 포함되지 않는다', async () => {
    const entries = await buildSitemapEntries({
      fetchProducts: async () => [{ id: '1', slug: 'product-1', alternatives: [] }],
      fetchCategories: async () => [{ slug: 'cat-1' }],
      fetchMagazines: async () => [{ slug: 'mag-1' }],
    });

    const urls = entries.map(e => e.url);
    for (const url of urls) {
      expect(url).not.toContain('/search');
      expect(url).not.toContain('/compare');
      expect(url.endsWith('.md')).toBe(false);
    }
  });

  it('sitemap 항목에 중복 hreflang/alternates 객체를 넣지 않고 HTML head에 위임한다', async () => {
    const entries = await buildSitemapEntries({
      fetchProducts: async () => [{ id: '1', slug: 'test' }],
      fetchCategories: async () => [],
      fetchMagazines: async () => [],
    });

    for (const entry of entries) {
      expect((entry as Record<string, unknown>).alternates).toBeUndefined();
    }
  });

  it('실제 updatedAt 또는 publishedAt이 있을 때만 lastModified를 포함한다', async () => {
    const date1 = new Date('2026-03-01T10:00:00Z');
    const date2 = new Date('2026-02-01T10:00:00Z');

    const entries = await buildSitemapEntries({
      fetchProducts: async () => [
        { id: '1', slug: 'updated', updatedAt: date1, publishedAt: date2 },
        { id: '2', slug: 'published-only', publishedAt: date2 },
        { id: '3', slug: 'no-dates' },
      ],
      fetchCategories: async () => [{ slug: 'category-without-date' }],
      fetchMagazines: async () => [],
    });

    const updatedEntry = entries.find(e => e.url === `${CANONICAL_ORIGIN}/ko/products/updated`);
    expect(updatedEntry?.lastModified).toEqual(date1);

    const publishedEntry = entries.find(e => e.url === `${CANONICAL_ORIGIN}/ko/products/published-only`);
    expect(publishedEntry?.lastModified).toEqual(date2);

    const noDateEntry = entries.find(e => e.url === `${CANONICAL_ORIGIN}/ko/products/no-dates`);
    expect(noDateEntry?.lastModified).toBeUndefined();

    const categoryEntry = entries.find(e => e.url === `${CANONICAL_ORIGIN}/ko/categories/category-without-date`);
    expect(categoryEntry?.lastModified).toBeUndefined();
  });

  it('100개 이상의 상품도 빠짐없이 모두 포함한다', async () => {
    const count = 125;
    const mockProducts: SitemapProduct[] = Array.from({ length: count }, (_, i) => ({
      id: `p-${i + 1}`,
      slug: `product-${i + 1}`,
      alternatives: [],
    }));

    const entries = await buildSitemapEntries({
      fetchProducts: async () => mockProducts,
      fetchCategories: async () => [],
      fetchMagazines: async () => [],
    });

    for (let i = 1; i <= count; i++) {
      expect(entries.some(e => e.url === `${CANONICAL_ORIGIN}/ko/products/product-${i}`)).toBe(true);
      expect(entries.some(e => e.url === `${CANONICAL_ORIGIN}/en/products/product-${i}`)).toBe(true);
    }
  });
});
