import { MagazineWriteSection } from '@darun/admin-magazines-shell';
import { PageShell } from '@darun/ui-admin';

export const MagazineCreatePage = () => (
  <PageShell title={'새로운 매거진 발행'}>
    <MagazineWriteSection />
  </PageShell>
);
