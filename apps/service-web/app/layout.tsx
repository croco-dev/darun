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
  description:
    '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다. 다양한 소프트웨어, 웹사이트, 어플리케이션를 검색하고 리뷰를 확인해보세요.',
  keywords: ['비교', '대안', '비슷한', '장단점', '다른 사이트', '다른 서비스', '다른 앱'],
  openGraph: {
    siteName: '다른(darun)',
    url: 'https://www.darun.io',
    title: '다른(darun)',
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
        <meta name="naver-site-verification" content="9df72f43242db6a7b1048dee830cef5b44e00a7a" />
      </head>
      <body className={pretendardFont.className}>
        <KumaRegistry>
          <CookiesProvider>
            <ServerRootProvider>
              <ClientRootProvider>{children}</ClientRootProvider>
            </ServerRootProvider>
          </CookiesProvider>
        </KumaRegistry>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8177584316528588"
          crossOrigin="anonymous"
        ></script>
      </body>
    </html>
  );
}
