import 'normalize.css/normalize.css';
import '../globals.css';

import { pretendardFont } from '@croco/utils-next-font-pretendard';

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CookiesProvider } from 'next-client-cookies/server';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { ReactNode } from 'react';
import { routing } from '../../i18n/routing';
import { ClientRootProvider } from '../client';
import { ServerRootProvider } from '../server';

const LOCALE_TO_OG_LOCALE: Record<string, string> = {
  ko: 'ko_KR',
  en: 'en_US',
};

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;

  const alternatesLanguages: Record<string, string> = {};
  for (const loc of routing.locales) {
    alternatesLanguages[loc] = `/${loc}`;
  }
  alternatesLanguages['x-default'] = `/${routing.defaultLocale}`;

  const ogLocale = LOCALE_TO_OG_LOCALE[locale];

  return {
    metadataBase: new URL('https://www.darun.io'),
    title: '다른 - 서비스 비교를 한 곳에서',
    description:
      '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다. 다양한 소프트웨어, 웹사이트, 어플리케이션를 검색하고 리뷰를 확인해보세요.',
    keywords: ['비교', '대안', '비슷한', '장단점', '다른 사이트', '다른 서비스', '다른 앱'],
    alternates: {
      canonical: `/${locale}`,
      languages: alternatesLanguages,
    },
    openGraph: {
      siteName: '다른(darun)',
      url: 'https://www.darun.io',
      title: '다른 - 서비스 비교를 한 곳에서',
      description:
        '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다. 다양한 소프트웨어, 웹사이트, 어플리케이션를 검색하고 리뷰를 확인해보세요.',
      type: 'website',
      locale: ogLocale,
      images: [
        {
          url: 'https://darun-image.doda.dev/?format=png',
          width: 1200,
          height: 630,
          alt: '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: '다른 - 서비스 비교를 한 곳에서',
      description:
        '다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다. 다양한 소프트웨어, 웹사이트, 어플리케이션를 검색하고 리뷰를 확인해보세요.',
      images: ['https://darun-image.doda.dev/?format=png'],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const content = ServerRootProvider({
    children: <ClientRootProvider>{children}</ClientRootProvider>,
  });

  return (
    <html lang={locale}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
        <link rel="icon" href="/images/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png" />
        <meta name="naver-site-verification" content="9df72f43242db6a7b1048dee830cef5b44e00a7a" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: '다른(darun)',
              url: 'https://www.darun.io',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://www.darun.io/search/product?query={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className={pretendardFont.className}>
        <NextIntlClientProvider messages={messages}>
          <CookiesProvider>{content}</CookiesProvider>
        </NextIntlClientProvider>
        <script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8177584316528588"
          crossOrigin="anonymous"
          async
        />
        <script src="https://analytics.ahrefs.com/analytics.js" async data-key="19qS6SoXo5c041VRvZmh7g" />
      </body>
    </html>
  );
}
