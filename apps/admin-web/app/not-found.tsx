import { PageShell, AdminEmptyState } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';

export default function NotFoundPage() {
  return (
    <PageShell title={'404'}>
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <AdminEmptyState
          title="페이지를 찾을 수 없습니다."
          description="주소를 다시 확인하거나 대시보드로 돌아가 주세요."
          className="min-h-0 p-0"
        />
        <Link href="/">
          <button
            type="button"
            className="rounded-lg bg-dark-900 px-4 py-2.5 text-sm font-medium text-white transition motion-reduce:transition-none outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40"
          >
            대시보드로 돌아가기
          </button>
        </Link>
      </div>
    </PageShell>
  );
}
