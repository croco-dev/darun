import { PageShell, AdminEmptyState, AdminPanel } from '@darun/ui-admin';
import { Home } from 'lucide-react';

export default function HomePage() {
  return (
    <PageShell title={'대시보드'}>
      <AdminPanel>
        <AdminEmptyState
          title="다른 관리자 대시보드"
          description="왼쪽 메뉴에서 작업을 선택해 주세요."
          icon={<Home className="h-8 w-8 text-dark-400 mb-3" strokeWidth={1.5} />}
          className="py-16"
        />
      </AdminPanel>
    </PageShell>
  );
}
