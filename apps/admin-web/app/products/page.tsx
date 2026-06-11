import { ProductListRefreshButton } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { PageShell } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { Plus } from 'lucide-react';
import { ProductListSection } from '../../features/products/ProductListSection';

export default function ProductListPage() {
  return (
    <PageShell
      title={'서비스 목록'}
      rightSide={
        <div className="flex gap-2">
          <ProductListRefreshButton />
          <Link href="/products/new">
            <Button
              type="button"
              variant="contained"
              color="primary"
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              추가하기
            </Button>
          </Link>
        </div>
      }
    >
      <ProductListSection />
    </PageShell>
  );
}
