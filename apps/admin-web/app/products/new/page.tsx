import { PageShell } from '@darun/ui-admin';
import { NewProductFormSection } from '~/features/products/NewProductFormSection';

export default function NewProductPage() {
  return (
    <PageShell title={'새로운 서비스'}>
      <NewProductFormSection />
    </PageShell>
  );
}
