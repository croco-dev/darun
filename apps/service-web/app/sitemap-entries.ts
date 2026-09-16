import { MetadataRoute } from 'next';
import { absolutePublicUrl } from '../lib/seo/url';

export type SitemapProduct = {
  id: string;
  slug: string;
  updatedAt?: string | Date | null;
  publishedAt?: string | Date | null;
  alternatives?: Array<{ slug?: string | null }> | null;
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

  // 1. Homepages (ko, en)
  addEntry('ko', '', { changeFrequency: 'daily', priority: 1.0 });
  addEntry('en', '', { changeFrequency: 'daily', priority: 1.0 });

  // 2. Fixed site routes (ko, en)
  addEntry('ko', '/ranking', { changeFrequency: 'daily', priority: 0.9 });
  addEntry('en', '/ranking', { changeFrequency: 'daily', priority: 0.9 });
  addEntry('ko', '/about', { changeFrequency: 'monthly', priority: 0.5 });
  addEntry('en', '/about', { changeFrequency: 'monthly', priority: 0.5 });

  // 3. Categories (ko, en)
  for (const category of categories) {
    if (!category.slug) continue;
    addEntry('ko', `/categories/${category.slug}`, { changeFrequency: 'weekly', priority: 0.7 });
    addEntry('en', `/categories/${category.slug}`, { changeFrequency: 'weekly', priority: 0.7 });
  }

  // 4. Products (ko, en) + indexable alternatives
  for (const product of products) {
    if (!product.slug) continue;
    const lastModified = parseDate(product.updatedAt) ?? parseDate(product.publishedAt);
    addEntry('ko', `/products/${product.slug}`, { lastModified, changeFrequency: 'weekly', priority: 0.8 });
    addEntry('en', `/products/${product.slug}`, { lastModified, changeFrequency: 'weekly', priority: 0.8 });

    // Only include alternatives route if product has at least one alternative
    if (product.alternatives && product.alternatives.length > 0) {
      addEntry('ko', `/products/${product.slug}/alternatives`, {
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
      addEntry('en', `/products/${product.slug}/alternatives`, {
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  // 5. Magazines (ko only!)
  for (const magazine of magazines) {
    if (!magazine.slug) continue;
    const lastModified = parseDate(magazine.updatedAt) ?? parseDate(magazine.publishedAt);
    addEntry('ko', `/magazines/${magazine.slug}`, { lastModified, changeFrequency: 'weekly', priority: 0.7 });
  }

  return entries;
}
