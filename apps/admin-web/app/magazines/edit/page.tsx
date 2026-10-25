import { PageShell } from '@darun/ui-admin';
import { notFound } from '@darun/utils-router';
import { MagazineEditSection } from '../../../features/magazines/MagazineEditSection/MagazineEditSection';

export default async function MagazineEditPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string | string[] }>;
}) {
  const { slug } = await searchParams;
  if (typeof slug !== 'string' || !slug) notFound();
  return (
    <PageShell title="매거진 편집" backHref="/magazines">
      <MagazineEditSection key={slug} slug={slug} />
    </PageShell>
  );
}
