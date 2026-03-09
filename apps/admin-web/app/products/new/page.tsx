import { NewProductFormSection } from '@darun/admin-products-shell';
import { PageShell } from '@darun/ui-admin';

export default function NewProductPage() {
  return (
    <PageShell title={'새로운 서비스'}>
      <NewProductFormSection />
    </PageShell>
  );
}
