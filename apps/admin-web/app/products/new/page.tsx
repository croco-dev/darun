import { PageShell } from '@darun/ui-admin';
import { NewProductFormSection } from '../../../features/products/NewProductFormSection';
import { ProductResearchSection } from '../../../features/products/ProductResearchSection';

export default function NewProductPage() {
  return (
    <PageShell title="새로운 서비스" backHref="/products">
      <div className="flex flex-col gap-4">
        <ProductResearchSection />
        <NewProductFormSection />
      </div>
    </PageShell>
  );
}
