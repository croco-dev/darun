import { PageShell } from '@darun/ui-admin';
import { ProductResearchHistory } from '../../../../features/products/ProductResearchHistory';

export default function ProductResearchHistoryPage() {
  return (
    <PageShell title="서비스 조사 이력" backHref="/products/new">
      <ProductResearchHistory />
    </PageShell>
  );
}
