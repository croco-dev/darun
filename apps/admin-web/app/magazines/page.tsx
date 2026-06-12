import { Button } from '@darun/ui';
import { AdminLoadingState, PageShell } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { Plus } from 'lucide-react';
import { Suspense } from 'react';
import { MagazinesList } from '../../features/magazines/MagazinesList/MagazinesList';

export default function MagazineListPage() {
  return (
    <PageShell
      title={'다른 매거진'}
      rightSide={
        <div className="flex gap-2">
          <Link href="/magazines/create">
            <Button type="button" variant="contained" color="primary" className="flex items-center gap-2">
              새로운 매거진 발행
              <Plus size={16} />
            </Button>
          </Link>
        </div>
      }
    >
      <Suspense fallback={<AdminLoadingState />}>
        <MagazinesList />
      </Suspense>
    </PageShell>
  );
}
