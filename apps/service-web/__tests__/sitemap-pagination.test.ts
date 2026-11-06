import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getPartition } from '../app/sitemap/[id]/route';
import { discoverSitemapPartitions, getSitemapPartition } from '../app/sitemap-data';
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
      const matches = products.filter(
        p =>
          (!variables.after || p.id < variables.after) &&
          (!variables.upperBoundId || p.id <= variables.upperBoundId) &&
          (!variables.lowerBoundId || p.id >= variables.lowerBoundId)
      );
      return {
        data: {
          publishedProductsForSitemap: matches.slice(0, variables.first),
        },
      };
    }
    if (variables?.locale) return { data: { categories: [] } };
    return { data: { publishedMagazines: [] } };
  });
});

describe('sitemap cursor partitions', () => {
  it('processes each product a bounded number of times in a broad public range', async () => {
    let slugReads = 0;
    products = products.slice(0, 1000).map(product => ({
      ...product,
      get slug() {
        slugReads++;
        return product.slug;
      },
    }));
    const entries = await getSitemapPartition(`v2~${products[0].id}~${products[999].id}`);
    expect(entries).toHaveLength(2000);
    expect(slugReads).toBeLessThanOrEqual(4000);
  });

  it('preserves URL deduplication across range pages', async () => {
    products = products.slice(0, 200);
    products[100] = { ...products[100], slug: products[0].slug };
    const entries = await getSitemapPartition(`v2~${products[0].id}~${products[199].id}`);
    expect(entries).toHaveLength(398);
    expect(entries.filter(entry => entry.url.endsWith(`/products/${products[0].slug}`))).toHaveLength(2);
    expect(entries.some(entry => entry.url.endsWith(`/products/${products[199].slug}`))).toBe(true);
  });

  it('enforces the accumulated XML byte limit across bounded pages', async () => {
    products = products.slice(0, 300).map((product, index) => ({
      ...product,
      slug: `${index}-${'a'.repeat(20000)}`,
    }));
    await expect(getSitemapPartition(`v2~${products[0].id}~${products[299].id}`)).rejects.toThrow('exceeds XML limits');
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('bounds range reads even when source rows have no usable slugs', async () => {
    products = Array.from({ length: 25001 }, (_, index) => ({
      id: String(30000 - index).padStart(26, '0'),
      slug: '',
    }));
    await expect(getSitemapPartition(`v2~${products[0].id}~${products[25000].id}`)).rejects.toThrow(
      'exceeds XML limits'
    );
    expect(query).toHaveBeenCalledTimes(251);
  });

  it.each([1, 5])('keeps every existing URL after %i newer products are published', async count => {
    products = products.slice(0, 200);
    const original = [...products];
    const ids = (await discoverSitemapPartitions()).filter(({ id }) => !id.startsWith('static'));
    products.unshift(
      ...Array.from({ length: count }, (_, i) => ({
        id: `Z${i}`,
        slug: `new-${i}`,
      })).reverse()
    );
    const entries = (await Promise.all(ids.map(({ id }) => getSitemapPartition(id)))).flat();
    for (const product of original) {
      for (const locale of ['ko', 'en']) {
        expect(entries.some(entry => entry.url === `https://www.darun.io/${locale}/products/${product.slug}`)).toBe(
          true
        );
      }
    }
    const refreshed = (await discoverSitemapPartitions()).filter(({ id }) => !id.startsWith('static'));
    const newEntries = (await Promise.all(refreshed.map(({ id }) => getSitemapPartition(id)))).flat();
    expect(newEntries.some(entry => entry.url.endsWith('/products/new-0'))).toBe(true);
  });

  it('reads through an interior publication without losing the fixed lower boundary', async () => {
    products = products.slice(0, 201);
    const [interior] = products.splice(40, 1);
    const boundary = products[99];
    const ids = (await discoverSitemapPartitions()).filter(({ id }) => !id.startsWith('static'));
    products.splice(40, 0, { ...interior, slug: 'new-interior' });
    query.mockClear();
    const entries = await getSitemapPartition(ids[0].id);
    expect(entries.some(entry => entry.url.endsWith(`/products/${boundary.slug}`))).toBe(true);
    expect(entries.some(entry => entry.url.endsWith('/products/new-interior'))).toBe(true);
    expect(query.mock.calls.every(([args]) => args.variables.first === 100)).toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
  });

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

  it('finishes a fixed range even when both boundary rows have been deleted', async () => {
    products = products.slice(0, 200);
    const original = [...products];
    const ids = (await discoverSitemapPartitions()).filter(({ id }) => !id.startsWith('static'));
    products = products.filter(p => p !== original[0] && p !== original[99]);
    const entries = await getSitemapPartition(ids[0].id);
    expect(entries).toHaveLength(196);
    expect(entries[0].url).toContain(original[1].slug);
    expect(entries[entries.length - 1].url).toContain(original[98].slug);
    products = [];
    expect(await getSitemapPartition(ids[0].id)).toEqual([]);
  });

  it('still serves cursor URLs referenced by cached legacy indexes', async () => {
    const first = await getSitemapPartition('start~0');
    const second = await getSitemapPartition(`${products[99].id}~0`);
    expect(first[0].url).toContain('product-1');
    expect(second[0].url).toContain('product-101');
  });

  it('fails the whole range on a later page error', async () => {
    products = products.slice(0, 201);
    const [interior] = products.splice(40, 1);
    const ids = (await discoverSitemapPartitions()).filter(({ id }) => !id.startsWith('static'));
    products.splice(40, 0, interior);
    const implementation = query.getMockImplementation()!;
    query.mockImplementation(async args => {
      if (args.variables?.after) throw new Error('upstream unavailable');
      return implementation(args);
    });
    await expect(getSitemapPartition(ids[0].id)).rejects.toThrow('upstream unavailable');
  });

  it('rejects a growing range that no longer fits one XML file instead of returning a partial file', async () => {
    products = products.slice(0, 100);
    const ids = (await discoverSitemapPartitions()).filter(({ id }) => !id.startsWith('static'));
    products = products.map((p, i) => ({
      ...p,
      slug: `${i}-${'a'.repeat(50000)}`,
    }));
    await expect(getSitemapPartition(ids[0].id)).rejects.toThrow('exceeds XML limits');
  });

  it('rejects upstream rows outside the fixed range and non-advancing range pages', async () => {
    const high = products[0].id;
    const low = products[199].id;
    query.mockResolvedValue({
      data: { publishedProductsForSitemap: [products[200]] },
    });
    await expect(getSitemapPartition(`v2~${high}~${low}`)).rejects.toThrow('outside requested range');
    query.mockResolvedValue({
      data: { publishedProductsForSitemap: Array(100).fill(products[0]) },
    });
    await expect(getSitemapPartition(`v2~${high}~${low}`)).rejects.toThrow('did not advance');
  });

  it('keeps the root URL as a real XML index', async () => {
    const xml = await (await GET()).text();
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('/sitemap/static~0.xml');
    expect(xml).toContain(`/sitemap/v2~${products[5000].id}~${products[5000].id}.xml`);
  });

  it('rejects repeated or backwards cursors rather than looping', async () => {
    query.mockImplementation(async ({ variables }) =>
      variables?.first === 100
        ? {
            data: {
              publishedProductsForSitemap: Array.from({ length: 100 }, () => products[0]),
            },
          }
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
    const entries = Array.from({ length: 50001 }, (_, i) => ({
      url: `https://www.darun.io/ko/products/${i}`,
    }));
    const partitions = partitionSitemapEntries(entries);
    expect(partitions.flat()).toEqual(entries);
    expect(partitions.every(p => p.length <= 50000)).toBe(true);
    const large = Array.from({ length: 100 }, () => ({
      url: `https://www.darun.io/${'&'.repeat(100000)}`,
    }));
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
