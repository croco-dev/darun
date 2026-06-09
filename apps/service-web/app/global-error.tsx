'use client';

import { Button } from '@darun/ui';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="flex h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <div>
          <h2 className="text-2xl font-bold">문제가 발생했습니다</h2>
          <p className="mt-2 text-dark-600">애플리케이션에 오류가 발생했습니다. 다시 시도해주세요.</p>
        </div>

        <Button onClick={() => reset()}>다시 시도</Button>
      </body>
    </html>
  );
}
