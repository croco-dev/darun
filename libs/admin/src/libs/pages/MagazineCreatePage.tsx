import { AppShell, PageShell } from '@uis';
import { MagazineWriteSection } from '../magazines/shells/MagazineWriteSection';

export const MagazineCreatePage = () => (
  <AppShell>
    <PageShell title={'새로운 매거진 발행'}>
      <MagazineWriteSection />
    </PageShell>
  </AppShell>
);
