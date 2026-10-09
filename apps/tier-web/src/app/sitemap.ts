import { supabase } from '@/lib/supabase';
import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tier.darun.io';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // 데이터베이스에서 모든 앱 가져오기
  let appPages: MetadataRoute.Sitemap = [];
  try {
    const { data, error } = await supabase.from('apps').select('id, updated_at');

    if (!error && data) {
      appPages = data.map(app => ({
        url: `${siteUrl}/apps/${app.id}`,
        lastModified: app.updated_at ? new Date(app.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error('Error fetching apps for sitemap:', error);
  }

  return [...staticPages, ...tierPages, ...appPages];
}
