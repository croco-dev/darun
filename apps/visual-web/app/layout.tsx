import 'normalize.css/normalize.css';
import './globals.css';

import { Metadata } from 'next';
import localFont from 'next/font/local';
import { CookiesProvider } from 'next-client-cookies/server';
import { ReactNode } from 'react';
import { ClientRootProvider } from './client';
import { ServerRootProvider } from './server';

const pretendardFont = localFont({
  src: '../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
});

export const metadata: Metadata = {
  title: '다른 Visual — 디자인·스크린샷·UX 탐색',
  description:
    '다른 Visual에서 서비스의 실제 화면을 검색하고, 플랫폼과 화면 유형으로 나누어 디자인과 UX를 탐색해 보세요.',
  keywords: ['스크린샷', 'UX', '디자인', '화면', '서비스 화면', '다른', 'darun'],
  openGraph: {
    siteName: '다른(darun)',
    url: 'https://visual.darun.io',
    title: '다른 Visual — 디자인·스크린샷·UX 탐색',
    description:
      '다른 Visual에서 서비스의 실제 화면을 검색하고, 플랫폼과 화면 유형으로 나누어 디자인과 UX를 탐색해 보세요.',
  },
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
        <CookiesProvider>
          <ServerRootProvider>
            <ClientRootProvider>{children}</ClientRootProvider>
          </ServerRootProvider>
        </CookiesProvider>
      </body>
    </html>
  );
}
