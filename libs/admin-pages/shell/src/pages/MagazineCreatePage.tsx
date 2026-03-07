import { MagazineWriteSection } from '@darun/admin-magazines/shell';
import { AppShell, PageShell } from '../uis';

export const MagazineCreatePage = () => (
  <AppShell>
    <PageShell title={'새로운 매거진 발행'}>
      <MagazineWriteSection />
    </PageShell>
  </AppShell>
);
