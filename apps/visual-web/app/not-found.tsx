import { Link } from '@darun/utils-router';
import { VisualLayout } from './VisualLayout';

export default function NotFound() {
  return (
    <VisualLayout>
      <main className="w-full py-20">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 text-center">
          <p className="text-5xl font-bold tracking-tight text-dark-900">404</p>
          <h1 className="text-lg font-bold text-dark-900">페이지를 찾을 수 없어요.</h1>
          <p className="text-sm text-dark-500">
            주소가 바뀌었거나, 화면이 삭제되었거나, 아직 공개되지 않았을 수 있어요.
          </p>
          <Link
            href="/"
            className="mt-2 rounded-xl bg-dark-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            Visual 홈으로
          </Link>
        </div>
      </main>
    </VisualLayout>
  );
}
