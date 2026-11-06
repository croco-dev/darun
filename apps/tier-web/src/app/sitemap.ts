import { supabase } from '@/lib/supabase';
import { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { connection } from 'next/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tier.darun.io';

// Cache only a complete traversal; a failed page must never replace the catalog.
const getAppPages = unstable_cache(
  async (): Promise<MetadataRoute.Sitemap> => {
    const appPages: MetadataRoute.Sitemap = [];
    let cursor: string | undefined;

    while (true) {
      let query = supabase.from('apps').select('id, updated_at').order('id', { ascending: true }).limit(500);
      if (cursor) query = query.gt('id', cursor);
      const { data, error } = await query;
      if (error || !data) throw new Error('Failed to fetch apps for sitemap');
      if (data.length === 0) return appPages;

      const nextCursor = data[data.length - 1].id as string;
      if (!nextCursor || (cursor && nextCursor <= cursor)) {
        throw new Error('Sitemap app cursor did not advance');
      }
      appPages.push(
        ...data.map(app => ({
          url: `${siteUrl}/apps/${app.id}`,
          lastModified: app.updated_at ? new Date(app.updated_at) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }))
      );
      cursor = nextCursor;
    }
  },
  ['tier-sitemap-apps', siteUrl],
  { revalidate: 900 }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Build-only environments have no catalog. Load it on the first real request.
  await connection();
  // 기본 페이지들
  const staticPages = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/apps`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ];

  // 티어별 페이지
  const tierPages = [1, 2, 3, 0].map(tier => ({
    url: `${siteUrl}?tier=${tier}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const appPages = await getAppPages();

  return [...staticPages, ...tierPages, ...appPages];
}
