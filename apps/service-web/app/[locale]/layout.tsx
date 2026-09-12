import 'normalize.css/normalize.css';
import '../globals.css';

import { Metadata } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { CookiesProvider } from 'next-client-cookies/server';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { ReactNode } from 'react';
import { routing } from '../../i18n/routing';
import { SITE_COPY } from '../../lib/seo/metadata';
import { normalizeLocale, PUBLIC_ORIGIN } from '../../lib/seo/url';
import { ClientRootProvider } from '../client';
import { ServerRootProvider } from '../server';

const LOCALE_TO_OG_LOCALE: Record<string, string> = {
  ko: 'ko_KR',
  en: 'en_US',
};

const pretendardFont = localFont({
  src: '../../../../node_modules/@croco/utils-next-font-pretendard/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
});

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = normalizeLocale(locale);
  const copy = SITE_COPY[currentLocale];
  const ogLocale = LOCALE_TO_OG_LOCALE[locale] ?? 'ko_KR';

  return {
    metadataBase: new URL(PUBLIC_ORIGIN),
    title: {
      default: copy.title,
      template: `%s`,
    },
    description: copy.description,
    openGraph: {
      siteName: '다른(darun)',
      title: copy.title,
      description: copy.description,
      type: 'website',
      locale: ogLocale,
      images: [
        {
          url: 'https://darun-image.doda.dev/?format=png',
          width: 1200,
          height: 630,
          alt: copy.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
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
      </head>
      <body className={`${pretendardFont.className} selection:bg-brand-200 selection:text-dark-900`}>
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
