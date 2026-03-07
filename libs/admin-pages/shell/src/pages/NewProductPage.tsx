import { NewProductFormSection } from '@darun/admin-products-shell';
import { AppShell, PageShell } from '../uis';

export const NewProductPage = () => (
  <AppShell>
    <PageShell title={'새로운 서비스'}>
      <NewProductFormSection />
    </PageShell>
  </AppShell>
);
