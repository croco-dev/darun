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
    <div className="flex h-screen flex-col items-center justify-center gap-6 p-6" data-testid="error-search">
      <h2 className="text-2xl font-bold">검색 중 문제가 발생했습니다</h2>
      <p className="text-center text-dark-500">
        검색 결과를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>

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
