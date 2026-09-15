import { CompanyListRefreshButton } from '@darun/companies-feature';
import { Button } from '@darun/ui';
import { AdminLoadingState, PageShell } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { Plus } from 'lucide-react';
import { Suspense } from 'react';
import { AllCompaniesList } from '../../features/companies/AllCompaniesList/AllCompaniesList';

export default function CompanyListPage() {
  return (
    <PageShell
      title={'기업(업체) 목록'}
      rightSide={
        <div className="flex gap-2">
          <CompanyListRefreshButton />
          <Link href="/companies/new">
            <Button type="button" variant="contained" color="primary" className="flex items-center gap-2">
              <Plus size={16} />
              기업 추가
            </Button>
          </Link>
        </div>
      }
    >
      <Suspense fallback={<AdminLoadingState />}>
        <AllCompaniesList />
      </Suspense>
    </PageShell>
  );
}
