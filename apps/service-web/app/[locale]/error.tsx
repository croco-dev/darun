'use client';

import { AlertTriangle, Button } from '@darun/ui';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Link } from '../../i18n/navigation';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-gradient-to-b from-surface-50/60 via-white to-white p-6">
      <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-card-xl border border-dark-150/80 bg-white/95 p-8 text-center shadow-card backdrop-blur-xs md:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cherry-200/80 bg-gradient-to-br from-cherry-50 to-cherry-100 text-cherry-600 shadow-2xs">
          <AlertTriangle className="h-8 w-8 stroke-[2]" aria-hidden="true" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-cherry-200/80 bg-cherry-50 px-3 py-0.5 font-mono text-xs font-bold tracking-widest text-cherry-700 shadow-2xs">
            ERROR
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-dark-900 break-keep sm:text-3xl">문제가 발생했습니다</h2>
          <p className="max-w-md text-sm leading-relaxed text-dark-600 break-keep sm:text-base">
            일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Button onClick={() => reset()} variant="shadow" color="primary" size="md">
            다시 시도
          </Button>
          <Link
            href="/"
            className="transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <Button as="span" variant="shadow" color="secondary" size="md">
              홈으로 이동
            </Button>
          </Link>
        </div>

        {isDev && (
          <div className="mt-4 w-full overflow-auto rounded-card border border-dark-150 bg-surface-100 p-4 text-left font-mono text-xs text-dark-700">
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
