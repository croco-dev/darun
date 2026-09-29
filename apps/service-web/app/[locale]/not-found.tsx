import { Button, Compass, ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { Link } from '../../i18n/navigation';
import { normalizeLocale } from '../../lib/seo/url';

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale(await getLocale());
  return {
    title: locale === 'en' ? 'Page Not Found - Darun' : '페이지를 찾을 수 없습니다 - 다른',
  };
}

export default async function NotFound() {
  const locale = normalizeLocale(await getLocale());
  const isKo = locale === 'ko';

  return (
    <Layout>
      <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col justify-center bg-gradient-to-b from-surface-50/60 via-white to-white">
        <ContentArea className="flex items-center justify-center py-20 md:py-28">
          <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-card-xl border border-dark-150/80 bg-white/95 p-8 text-center shadow-card backdrop-blur-xs md:p-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-700 shadow-2xs">
              <Compass size={28} className="shrink-0 stroke-[1.75]" aria-hidden="true" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-dark-150 bg-surface-100 px-3 py-0.5 font-mono text-xs font-bold tracking-widest text-dark-600 shadow-2xs">
                ERROR 404
              </span>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-dark-900 break-words [word-break:keep-all] sm:text-3xl">
                {isKo ? '페이지를 찾을 수 없습니다' : 'Page Not Found'}
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-dark-600 break-words [word-break:keep-all] sm:text-base">
                {isKo
                  ? '요청하신 페이지가 삭제되었거나 잘못된 경로입니다. 아래 링크를 통해 다시 탐색해 보세요.'
                  : 'The page you are looking for does not exist or has been moved.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/"
                className="inline-flex rounded-xl motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                <Button
                  as="span"
                  variant="shadow"
                  color="primary"
                  size="md"
                  className="active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  {isKo ? '홈으로 이동' : 'Go to Home'}
                </Button>
              </Link>
              <Link
                href="/ranking"
                className="inline-flex rounded-xl motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                <Button
                  as="span"
                  variant="shadow"
                  color="secondary"
                  size="md"
                  className="active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  {isKo ? '인기 랭킹 보기' : 'Explore Ranking'}
                </Button>
              </Link>
            </div>
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
