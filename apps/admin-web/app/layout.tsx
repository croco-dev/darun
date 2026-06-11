import 'normalize.css/normalize.css';
import '@mantine/core/styles.css';
import './globals.css';
import 'remixicon/fonts/remixicon.css';

import { Metadata } from 'next';
import localFont from 'next/font/local';
import { ReactNode } from 'react';
import { ClientRootProvider } from './client';
import { ServerRootProvider } from './server';
import { AppShell } from '../layouts/AppShell';

const pretendardFont = localFont({
  src: '../../../node_modules/@croco/utils-next-font-pretendard/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
});

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
      </head>
      <body className={pretendardFont.className}>
        <ServerRootProvider>
          <ClientRootProvider>
            <AppShell>{children}</AppShell>
          </ClientRootProvider>
        </ServerRootProvider>
      </body>
    </html>
  );
}
