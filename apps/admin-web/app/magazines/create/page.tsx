import { PageShell } from '@darun/ui-admin';
import { MagazineWriteSection } from '../../../features/magazines/MagazineWriteSection/MagazineWriteSection';

export default function MagazineCreatePage() {
  return (
    <PageShell title="새 매거진 작성" backHref="/magazines">
      <MagazineWriteSection />
    </PageShell>
  );
}
