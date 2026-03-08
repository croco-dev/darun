import { AllCompaniesList } from '@darun/admin-companies-shell';
import { ProductListRefreshButton } from '@darun/admin-products-shell';
import { Link } from '@darun/utils-router';
import { IconPlus } from '@tabler/icons-react';
import { AppShell, PageShell } from '../uis';

export const CompanyListPage = () => {
  return (
    <AppShell>
      <PageShell
        title={'기업(업체) 목록'}
        rightSide={
          <div className="flex gap-2">
            <ProductListRefreshButton />
            <Link href="/companies/new">
              <button className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                기업 추가
                <IconPlus size={16} />
              </button>
            </Link>
          </div>
        }
      >
        <AllCompaniesList />
      </PageShell>
    </AppShell>
  );
};
