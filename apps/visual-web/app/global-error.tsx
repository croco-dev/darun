'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import type { ComponentType } from 'react';
import { useEffect } from 'react';

const NextErrorPage = NextError as unknown as ComponentType<{
  statusCode: number;
}>;

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextErrorPage statusCode={0} />
      </body>
    </html>
  );
}
