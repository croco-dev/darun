import { PageShell } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';

export default function NotFoundPage() {
  return (
    <PageShell title={'404'}>
      <div className="flex flex-col items-center gap-6 py-16">
        <p className="text-gray-500">
          페이지를 찾을 수 없습니다. 주소를 다시 확인해 주세요.
        </p>
        <Link href="/">
          <button
            type="button"
            className="rounded bg-gray-800 px-4 py-2 text-white transition-colors hover:bg-gray-700"
          >
            대시보드로 돌아가기
          </button>
        </Link>
      </div>
    </PageShell>
  );
}
