import { MagazinesList } from '@darun/admin-magazines-shell';
import { PageShell } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { IconPlus } from '@tabler/icons-react';
import { Suspense } from 'react';

export default function MagazineListPage() {
  return (
    <PageShell
      title={'다른 매거진'}
      rightSide={
        <div className="flex gap-2">
          <Link href="/magazines/create">
            <button
              type="button"
              className="flex items-center gap-2 rounded bg-gray-800 px-4 py-2 text-white transition-colors hover:bg-gray-700"
            >
              새로운 매거진 발행
              <IconPlus size={16} />
            </button>
          </Link>
        </div>
      }
    >
      <Suspense fallback={<>로딩중...</>}>
        <MagazinesList />
      </Suspense>
    </PageShell>
  );
}
