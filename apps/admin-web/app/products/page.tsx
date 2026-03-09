import { ProductListRefreshButton } from '@darun/products-feature';
import { PageShell } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { Plus } from 'lucide-react';
import { ProductListSection } from '~/features/products/ProductListSection';

export default function ProductListPage() {
  return (
    <PageShell
      title={'서비스 목록'}
      rightSide={
        <div className="flex gap-2">
          <ProductListRefreshButton />
          <Link href="/products/new">
            <button
              type="button"
              className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
            >
              <Plus size={16} />
              추가하기
            </button>
          </Link>
        </div>
      }
    >
      <ProductListSection />
    </PageShell>
  );
}
