import { Button, Compass, ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { Metadata } from 'next';
import { Link } from '../../i18n/navigation';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다 - 다른',
};

export default function NotFound() {
  return (
    <Layout>
      <main className="flex w-full flex-col">
        <ContentArea className="flex items-center justify-center py-20 md:py-28">
          <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-card-xl border border-dark-150 bg-white p-8 text-center shadow-card md:p-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-700 shadow-2xs">
              <Compass size={28} className="stroke-[1.75]" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-dark-150 bg-surface-100 px-3 py-0.5 font-mono text-xs font-bold tracking-widest text-dark-600 shadow-2xs">
                ERROR 404
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-dark-900 break-keep sm:text-3xl">
                페이지를 찾을 수 없습니다
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-dark-600 break-keep sm:text-base">
                요청하신 페이지가 삭제되었거나 잘못된 경로입니다. 아래 링크를 통해 다시 탐색해 보세요.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/" className="focus-visible:outline-none">
                <Button variant="shadow" color="primary" size="md">
                  홈으로 이동
                </Button>
              </Link>
              <Link href="/ranking" className="focus-visible:outline-none">
                <Button variant="shadow" color="secondary" size="md">
                  인기 랭킹 보기
                </Button>
              </Link>
            </div>
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
