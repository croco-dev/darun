import { ProductContentReviewList } from '@darun/products-feature';
import { PageShell } from '@darun/ui-admin';

export default function ProductReviewsPage() {
  return (
    <PageShell title="서비스 검토 목록" backHref="/products">
      <ProductContentReviewList />
    </PageShell>
  );
}
