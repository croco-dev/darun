import 'normalize.css/normalize.css';
import '@mantine/core/styles.css';
import './globals.css';

import { pretendardFont } from '@croco/utils-next-font-pretendard';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
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
        <ColorSchemeScript />
      </head>
      <body className={pretendardFont.className}>
        <MantineProvider>
          <CookiesProvider>
            <ServerRootProvider>
              <ClientRootProvider>{children}</ClientRootProvider>
            </ServerRootProvider>
          </CookiesProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
