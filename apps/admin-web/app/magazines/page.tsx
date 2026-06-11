import { AdminLoadingState, PageShell } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { IconPlus } from '@tabler/icons-react';
import { Suspense } from 'react';
import { MagazinesList } from '../../features/magazines/MagazinesList/MagazinesList';

export default function MagazineListPage() {
  return (
    <PageShell
      title={'다른 매거진'}
      rightSide={
        <div className="flex gap-2">
          <Link href="/magazines/create">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-dark-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-dark-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/20"
            >
              새로운 매거진 발행
              <IconPlus size={16} />
            </button>
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
