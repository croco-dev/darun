'use client';

import { Button } from '@darun/ui';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cherry-300 bg-cherry-100 text-cherry-700">
          <AlertTriangle className="h-8 w-8 stroke-[2]" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-dark-900">문제가 발생했습니다</h2>
          <p className="max-w-md text-sm leading-relaxed text-dark-600 sm:text-base">
            일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>

      <Button onClick={() => reset()} variant="shadow" color="primary">
        다시 시도
      </Button>

      {isDev && (
        <div className="mt-8 w-full max-w-2xl overflow-auto rounded-card-lg border border-dark-150 bg-surface-100 p-4 font-mono text-xs">
          <p className="mb-2 font-bold">
            {error.name}: {error.message}
          </p>
          <pre>{error.stack}</pre>
          {error.digest && <p className="mt-2 text-dark-500">Digest: {error.digest}</p>}
        </div>
      )}
    </div>
  );
}
