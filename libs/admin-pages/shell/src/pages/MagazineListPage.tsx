import { MagazinesList } from '@darun/admin-magazines-shell';
import { Link } from '@darun/utils-router';
import { IconPlus } from '@tabler/icons-react';
import { Suspense } from 'react';
import { AppShell, PageShell } from '../uis';

export const MagazineListPage = () => {
  return (
    <AppShell>
      <PageShell
        title={'다른 매거진'}
        rightSide={
          <div className="flex gap-2">
            <Link href="/magazines/create">
              <button className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors">
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
    </AppShell>
  );
};
