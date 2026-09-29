'use client';

import { AlertCircle, Button, Search } from '@darun/ui';
import * as Sentry from '@sentry/nextjs';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { Link } from '../../../i18n/navigation';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams();
  const isKo = params?.locale === 'ko';

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center bg-gradient-to-b from-surface-50/60 via-white to-white p-6"
      data-testid="error-search"
    >
      <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-card-xl border border-dark-150/80 bg-white/95 p-8 text-center shadow-card backdrop-blur-xs md:p-10">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-600 shadow-2xs">
          <Search size={26} className="shrink-0 stroke-[2]" aria-hidden="true" />
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-cherry-600 text-white">
            <AlertCircle size={12} className="shrink-0 stroke-[2.5]" aria-hidden="true" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-dark-900 break-words [word-break:keep-all]">
            {isKo ? '검색 중 문제가 발생했습니다' : 'Error searching products'}
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-dark-600 break-words [word-break:keep-all] sm:text-base">
            {isKo
              ? '검색 결과를 불러오는 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
              : 'An error occurred while loading search results. Please try again shortly.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Button
            onClick={() => reset()}
            variant="shadow"
            color="primary"
            size="md"
            className="active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span className="whitespace-nowrap">{isKo ? '다시 시도' : 'Try again'}</span>
          </Button>
          <Link
            href="/"
            className="rounded-xl motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <Button
              as="span"
              variant="shadow"
              color="secondary"
              size="md"
              className="active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="whitespace-nowrap">{isKo ? '홈으로 이동' : 'Go to Home'}</span>
            </Button>
          </Link>
        </div>

        {isDev && (
          <div className="mt-4 w-full max-h-60 overflow-y-auto rounded-card border border-dark-150 bg-surface-100 p-4 text-left font-mono text-xs text-dark-700">
            <p className="mb-2 font-bold text-cherry-700">
              {error.name}: {error.message}
            </p>
            <pre className="overflow-x-auto text-2xs leading-normal">{error.stack}</pre>
            {error.digest && <p className="mt-2 text-dark-500">Digest: {error.digest}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
