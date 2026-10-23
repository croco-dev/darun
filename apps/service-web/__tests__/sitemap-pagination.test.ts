import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getPartition } from '../app/sitemap/[id]/route';
import { discoverSitemapPartitions } from '../app/sitemap-data';
import type { SitemapProduct } from '../app/sitemap-entries';
import { partitionSitemapEntries, serializeSitemap } from '../app/sitemap-entries';
import { GET } from '../app/sitemap.xml/route';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../app/getServerClient', () => ({ getClient: () => ({ query }) }));

let products: SitemapProduct[];
beforeEach(() => {
  products = Array.from({ length: 5001 }, (_, i) => ({
    id: `01ARZ3NDEKTSV4RRFF${(10000 - i).toString(16).toUpperCase().padStart(8, '0')}`,
    slug: `product-${i + 1}`,
    hasAlternatives: i === 5000,
  }));
  query.mockReset();
  query.mockImplementation(async ({ variables }) => {
    if (variables?.first === 100) {
      const start = variables.after ? products.findIndex(p => p.id === variables.after) + 1 : 0;
      return { data: { publishedProductsForSitemap: products.slice(start, start + 100) } };
    }
    if (variables?.locale) return { data: { categories: [] } };
    return { data: { publishedMagazines: [] } };
  });
});

describe('sitemap cursor partitions', () => {
  it('discovers product 5001 and fetches only its bounded page when served', async () => {
    const ids = await discoverSitemapPartitions();
    const last = ids[ids.length - 1].id;
    query.mockClear();
    const response = await getPartition(new Request(`https://www.darun.io/sitemap/${last}.xml`), {
      params: Promise.resolve({ id: `${last}.xml` }),
    });
    expect(response.headers.get('Content-Type')).toContain('application/xml');
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    expect(await response.text()).toContain('<loc>https://www.darun.io/en/products/product-5001/alternatives</loc>');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0].variables.first).toBe(100);
  });

  it('keeps the root URL as a real XML index', async () => {
    const xml = await (await GET()).text();
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('/sitemap/static~0.xml');
    expect(xml).toContain(`/sitemap/${products[4999].id}~0.xml`);
  });

  it('rejects repeated or backwards cursors rather than looping', async () => {
    query.mockImplementation(async ({ variables }) =>
      variables?.first === 100
        ? { data: { publishedProductsForSitemap: Array.from({ length: 100 }, () => products[0]) } }
        : { data: { categories: [], publishedMagazines: [] } }
    );
    await expect(discoverSitemapPartitions()).rejects.toThrow('did not advance');
  });

  it('propagates failures after a successful page instead of publishing partial discovery', async () => {
    const implementation = query.getMockImplementation()!;
    query.mockImplementation(async args => {
      if (args.variables?.after) throw new Error('upstream unavailable');
      return implementation(args);
    });
    await expect(discoverSitemapPartitions()).rejects.toThrow('upstream unavailable');
  });

  it('bounds both URL count and conservative escaped XML size without dropping entries', () => {
    const entries = Array.from({ length: 50001 }, (_, i) => ({ url: `https://www.darun.io/ko/products/${i}` }));
    const partitions = partitionSitemapEntries(entries);
    expect(partitions.flat()).toEqual(entries);
    expect(partitions.every(p => p.length <= 50000)).toBe(true);
    const large = Array.from({ length: 100 }, () => ({ url: `https://www.darun.io/${'&'.repeat(100000)}` }));
    expect(partitionSitemapEntries(large).length).toBeGreaterThan(1);
    expect(partitionSitemapEntries(large).flat()).toEqual(large);
  });

  it('rejects malformed partition URLs before any upstream query', async () => {
    const response = await getPartition(new Request('https://www.darun.io/sitemap/bad.xml'), {
      params: Promise.resolve({ id: 'bad.xml' }),
    });
    expect(response.status).toBe(404);
    expect(query).not.toHaveBeenCalled();
  });

  it('escapes XML at the actual partition serializer boundary', () => {
    const xml = serializeSitemap([
      {
        url: 'https://www.darun.io/a?x=1&y=<tag>"\'',
        lastModified: new Date('2026-01-01T00:00:00Z'),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
    ]);
    expect(xml).toContain('x=1&amp;y=&lt;tag&gt;&quot;&apos;');
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>');
    expect(xml).toContain('<changefreq>weekly</changefreq><priority>0.8</priority>');
    expect(xml).not.toContain('<tag>');
  });
});
