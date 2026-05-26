import 'normalize.css/normalize.css';
import './globals.css';

import { Metadata } from 'next';
import localFont from 'next/font/local';
import { CookiesProvider } from 'next-client-cookies/server';
import { ReactNode } from 'react';
import { ClientRootProvider } from './client';
import { ServerRootProvider } from './server';

const pretendardFont = localFont({
  src: '../../../node_modules/@croco/utils-next-font-pretendard/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
});

export const metadata: Metadata = {
  title: '다른 - 서비스 비교를 한 곳에서',
  description:
    '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다. 다양한 소프트웨어, 웹사이트, 어플리케이션를 검색하고 리뷰를 확인해보세요.',
  keywords: ['비교', '대안', '비슷한', '장단점', '다른 사이트', '다른 서비스', '다른 앱'],
  openGraph: {
    siteName: '다른(darun)',
    url: 'https://visual.darun.io',
    title: '다른 - 서비스 비교를 한 곳에서',
    description:
      '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다. 다양한 소프트웨어, 웹사이트, 어플리케이션를 검색하고 리뷰를 확인해보세요.',
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
