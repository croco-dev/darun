import { PageShell } from '@darun/ui-admin';
import { MagazineWriteSection } from '../../../features/magazines/MagazineWriteSection/MagazineWriteSection';

export default function MagazineCreatePage() {
  return (
    <PageShell title={'새로운 매거진 발행'}>
      <MagazineWriteSection />
    </PageShell>
  );
}
