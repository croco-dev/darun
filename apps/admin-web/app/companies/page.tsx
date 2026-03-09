import { ProductListRefreshButton } from '@darun/products-feature';
import { PageShell } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { IconPlus } from '@tabler/icons-react';
import { AllCompaniesList } from '../../features/companies/AllCompaniesList/AllCompaniesList';

export default function CompanyListPage() {
  return (
    <PageShell
      title={'기업(업체) 목록'}
      rightSide={
        <div className="flex gap-2">
          <ProductListRefreshButton />
          <Link href="/companies/new">
            <button
              type="button"
              className="flex items-center gap-2 rounded bg-gray-800 px-4 py-2 text-white transition-colors hover:bg-gray-700"
            >
              기업 추가
              <IconPlus size={16} />
            </button>
          </Link>
        </div>
      }
    >
      <AllCompaniesList />
    </PageShell>
  );
}
