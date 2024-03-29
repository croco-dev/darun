import 'normalize.css/normalize.css';
import './globals.css';

import { pretendardFont } from '@croco/utils-next-font-pretendard';
import { KumaRegistry } from '@kuma-ui/next-plugin/registry';
import { Metadata } from 'next';
import { CookiesProvider } from 'next-client-cookies/server';
import { ReactNode } from 'react';
import { ClientRootProvider } from './client';
import { ServerRootProvider } from './server';

export const metadata: Metadata = {
  title: '다른(darun)',
  description: '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다. 다양한 서비스들을 검색해보세요.',
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
        <KumaRegistry>
          <CookiesProvider>
            <ServerRootProvider>
              <ClientRootProvider>{children}</ClientRootProvider>
            </ServerRootProvider>
          </CookiesProvider>
        </KumaRegistry>
      </body>
    </html>
  );
}
