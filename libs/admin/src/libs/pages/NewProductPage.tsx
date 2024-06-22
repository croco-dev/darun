import { AppShell, PageShell } from '@uis';
import { NewProductFormSection } from '../products/shells/NewProductFormSection';

export const NewProductPage = () => (
  <AppShell>
    <PageShell title={'새로운 서비스'}>
      <NewProductFormSection />
    </PageShell>
  </AppShell>
);
