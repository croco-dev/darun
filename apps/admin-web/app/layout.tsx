import 'normalize.css/normalize.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

import { pretendardFont } from '@croco/utils-next-font-pretendard';
import { ColorSchemeScript } from '@mantine/core';
import { Metadata } from 'next';
import { CookiesProvider } from 'next-client-cookies/server';
import { ReactNode } from 'react';
import { ClientRootProvider } from './client';
import { ServerRootProvider } from './server';

export const metadata: Metadata = {
  title: 'darun admin',
  description: 'darun.io',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
        <link rel="icon" href="/images/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png" />
        <ColorSchemeScript />
      </head>
      <body className={pretendardFont.className}>
        <CookiesProvider>
          <ServerRootProvider>
            <ClientRootProvider>{children}</ClientRootProvider>
          </ServerRootProvider>
        </CookiesProvider>
      </body>
    </html>
  );
}
