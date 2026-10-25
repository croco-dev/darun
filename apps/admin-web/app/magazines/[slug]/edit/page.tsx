import { PageShell } from '@darun/ui-admin';
import { MagazineEditSection } from '../../../../features/magazines/MagazineEditSection/MagazineEditSection';

export default async function MagazineEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PageShell title="매거진 편집" backHref="/magazines">
      <MagazineEditSection key={slug} slug={slug} />
    </PageShell>
  );
}
