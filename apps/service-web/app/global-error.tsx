'use client';

import './globals.css';

import { AlertTriangle, Button } from '@darun/ui';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-6 font-sans text-dark-900 antialiased">
        <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-card-xl border border-dark-150 bg-white p-8 text-center shadow-card sm:p-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cherry-200 bg-cherry-50 text-cherry-600 shadow-2xs">
            <AlertTriangle className="h-8 w-8 stroke-[2]" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-dark-900 break-keep">
              심각한 오류가 발생했습니다
              <span className="mt-1 block text-base font-normal text-dark-500">An unexpected error occurred</span>
            </h1>
            <p className="text-sm leading-relaxed text-dark-600 break-keep sm:text-base">
              애플리케이션을 로드하는 중 오류가 발생했습니다. 페이지를 새로고침하거나 다시 시도해주세요.
              <span className="mt-1 block text-xs text-dark-400 sm:text-sm">
                An error occurred while loading the application. Please refresh or try again.
              </span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <Button
              onClick={() => reset()}
              variant="shadow"
              color="primary"
              size="md"
              className="motion-reduce:transition-none"
            >
              다시 시도 / Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
