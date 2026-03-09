import { MagazineWriteSection } from '@darun/admin-magazines-shell';
import { PageShell } from '@darun/ui-admin';

export default function MagazineCreatePage() {
  return (
    <PageShell title={'새로운 매거진 발행'}>
      <MagazineWriteSection />
    </PageShell>
  );
}
