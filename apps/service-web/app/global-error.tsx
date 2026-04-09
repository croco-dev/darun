'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { ComponentType } from 'react';
import { useEffect } from 'react';

const NextErrorPage = NextError as unknown as ComponentType<{
  statusCode: number;
}>;

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextErrorPage statusCode={0} />
      </body>
    </html>
  );
}
