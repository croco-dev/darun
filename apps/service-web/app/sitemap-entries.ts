import { MetadataRoute } from 'next';
import { absolutePublicUrl } from '../lib/seo/url';

export type SitemapProduct = {
  id: string;
  slug: string;
  updatedAt?: string | Date | null;
  publishedAt?: string | Date | null;
  hasAlternatives?: boolean;
};

export type SitemapCategory = {
  id?: string;
  slug: string;
};

export type SitemapMagazine = {
  id?: string;
  slug: string;
  updatedAt?: string | Date | null;
  publishedAt?: string | Date | null;
};

export type SitemapDeps = {
  fetchProducts: () => Promise<SitemapProduct[]>;
  fetchCategories: () => Promise<SitemapCategory[]>;
  fetchMagazines: () => Promise<SitemapMagazine[]>;
  includeFixedRoutes?: boolean;
};

function parseDate(val?: string | Date | null): Date | undefined {
  if (!val) return undefined;
  const d = typeof val === 'string' ? new Date(val) : val;
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function buildSitemapEntries(deps: SitemapDeps): Promise<MetadataRoute.Sitemap> {
  const [products, categories, magazines] = await Promise.all([
    deps.fetchProducts(),
    deps.fetchCategories(),
    deps.fetchMagazines(),
  ]);

  const entries: MetadataRoute.Sitemap = [];
  const seenUrls = new Set<string>();

  type EntryOptions = {
    lastModified?: Date | undefined;
    changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
  };

  const addEntry = (locale: 'ko' | 'en', pathname: string, options?: EntryOptions) => {
    const url = absolutePublicUrl(locale, pathname);
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    const item: MetadataRoute.Sitemap[number] = { url };
    if (options?.lastModified) item.lastModified = options.lastModified;
    if (options?.changeFrequency) item.changeFrequency = options.changeFrequency;
    if (options?.priority !== undefined) item.priority = options.priority;

    entries.push(item);
  };

  if (deps.includeFixedRoutes !== false) {
    addEntry('ko', '', { changeFrequency: 'daily', priority: 1.0 });
    addEntry('en', '', { changeFrequency: 'daily', priority: 1.0 });
    addEntry('ko', '/ranking', { changeFrequency: 'daily', priority: 0.9 });
    addEntry('en', '/ranking', { changeFrequency: 'daily', priority: 0.9 });
    addEntry('ko', '/about', { changeFrequency: 'monthly', priority: 0.5 });
    addEntry('en', '/about', { changeFrequency: 'monthly', priority: 0.5 });
  }

  // 3. Categories (ko, en)
  for (const category of categories) {
    if (!category.slug) continue;
    const categorySlug = encodeURIComponent(category.slug);
    addEntry('ko', `/categories/${categorySlug}`, { changeFrequency: 'weekly', priority: 0.7 });
    addEntry('en', `/categories/${categorySlug}`, { changeFrequency: 'weekly', priority: 0.7 });
  }

  // 4. Products (ko, en) + indexable alternatives
  for (const product of products) {
    if (!product.slug) continue;
    const productSlug = encodeURIComponent(product.slug);
    const lastModified = parseDate(product.updatedAt) ?? parseDate(product.publishedAt);
    addEntry('ko', `/products/${productSlug}`, { lastModified, changeFrequency: 'weekly', priority: 0.8 });
    addEntry('en', `/products/${productSlug}`, { lastModified, changeFrequency: 'weekly', priority: 0.8 });

    // Only include alternatives route if product has at least one alternative
    if (product.hasAlternatives) {
      addEntry('ko', `/products/${productSlug}/alternatives`, {
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
      addEntry('en', `/products/${productSlug}/alternatives`, {
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  // 5. Magazines (ko only!)
  for (const magazine of magazines) {
    if (!magazine.slug) continue;
    const magazineSlug = encodeURIComponent(magazine.slug);
    const lastModified = parseDate(magazine.updatedAt) ?? parseDate(magazine.publishedAt);
    addEntry('ko', `/magazines/${magazineSlug}`, { lastModified, changeFrequency: 'weekly', priority: 0.7 });
  }

  return entries;
}

export function partitionSitemapEntries(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap[] {
  const partitions: MetadataRoute.Sitemap[] = [[]];
  let bytes = 1024; // XML declaration and urlset namespaces.
  for (const entry of entries) {
    // JSON overestimates our fixed metadata fields; six bytes per URL character
    // bounds XML entity escaping, including non-ASCII UTF-8.
    const entryBytes = new TextEncoder().encode(JSON.stringify(entry)).length * 6 + 512;
    if (entryBytes + 1024 > 50 * 1024 * 1024) throw new Error('Sitemap entry exceeds XML size limit');
    let partition = partitions[partitions.length - 1];
    if (partition.length === 50_000 || bytes + entryBytes > 50 * 1024 * 1024) {
      partition = [];
      partitions.push(partition);
      bytes = 1024;
    }
    partition.push(entry);
    bytes += entryBytes;
  }
  if (partitions.length > 50_000) throw new Error('Sitemap index exceeds URL limit');
  return partitions;
}

export function serializeSitemap(entries: MetadataRoute.Sitemap): string {
  const escapeXml = (value: string) =>
    value.replace(/[<>&"']/g, character => {
      switch (character) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case '"':
          return '&quot;';
        default:
          return '&apos;';
      }
    });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    entries
      .map(entry => {
        const modified = entry.lastModified instanceof Date ? entry.lastModified.toISOString() : entry.lastModified;
        return (
          '<url><loc>' +
          escapeXml(entry.url) +
          '</loc>' +
          (modified ? `<lastmod>${escapeXml(modified)}</lastmod>` : '') +
          (entry.changeFrequency ? `<changefreq>${escapeXml(entry.changeFrequency)}</changefreq>` : '') +
          (entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : '') +
          '</url>'
        );
      })
      .join('') +
    '</urlset>'
  );
}
