import { Button } from '@darun/ui';
import { PageShell } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { NewProductFormSection } from '../../../features/products/NewProductFormSection';
import { ProductResearchSection } from '../../../features/products/ProductResearchSection';

export default function NewProductPage() {
  return (
    <PageShell
      title="새로운 서비스"
      backHref="/products"
      rightSide={
        <Button as={Link} href="/products/new/research" target="_blank" rel="noopener" size="sm">
          조사 이력 (새 탭)
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <ProductResearchSection />
        <NewProductFormSection />
      </div>
    </PageShell>
  );
}
