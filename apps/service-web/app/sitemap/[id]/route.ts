import { getSitemapPartition } from '../../sitemap-data';
import { serializeSitemap } from '../../sitemap-entries';

export const revalidate = 3600;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^(static|start|[0-9a-z-]+)~(0|[1-9]\d*)\.xml$/i.test(id)) {
    return new Response('Not found', { status: 404 });
  }
  const entries = await getSitemapPartition(id.slice(0, -4));
  return new Response(serializeSitemap(entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
