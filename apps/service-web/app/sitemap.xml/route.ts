import { discoverSitemapPartitions } from '../sitemap-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const partitions = await discoverSitemapPartitions();
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    partitions.map(({ id }) => `<sitemap><loc>https://www.darun.io/sitemap/${id}.xml</loc></sitemap>`).join('') +
    '</sitemapindex>';
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
