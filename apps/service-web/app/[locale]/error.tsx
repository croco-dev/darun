'use client';

import { Button } from '@darun/ui';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">문제가 발생했습니다</h2>
        <p className="mt-2 text-dark-600">일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
      </div>

      <Button onClick={() => reset()}>다시 시도</Button>

      {isDev && (
        <div className="mt-8 w-full max-w-2xl overflow-auto rounded-lg bg-surface-100 p-4 font-mono text-xs">
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
