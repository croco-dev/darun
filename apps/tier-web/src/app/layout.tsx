import { Header } from '@/components/Header';
import { Toaster } from '@/components/ui/toaster';
import { pretendardFont } from '@croco/utils-next-font-pretendard';
import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tier.darun.io';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '다른티어 - iOS 26 Liquid Glass 대응 앱 분류 서비스',
    template: '%s | 다른티어',
  },
  description:
    'iOS 26의 Liquid Glass를 대응하는 앱들을 티어별로 분류합니다. 1티어부터 3티어까지, Croco 팀이 직접 앱스토어의 앱들을 평가하고 분류합니다.',
  keywords: [
    'iOS 26',
    'Liquid Glass',
    '앱 티어',
    '앱 분류',
    '앱스토어',
    '다른티어',
    'Croco',
    'iOS',
    'app ranking',
    'App Store',
  ],
  authors: [{ name: 'Croco 팀' }],
  creator: 'Croco 팀',
  publisher: '다른티어',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    title: '다른티어 - iOS 26 Liquid Glass 대응 앱 분류 서비스',
    description: 'iOS 26의 Liquid Glass를 대응하는 앱들을 티어별로 분류합니다. Croco 팀이 직접 평가하고 분류합니다.',
    siteName: '다른티어',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '다른티어 - iOS 26 Liquid Glass 대응 앱 분류',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '다른티어 - iOS 26 Liquid Glass 대응 앱 분류 서비스',
    description: 'iOS 26의 Liquid Glass를 대응하는 앱들을 티어별로 분류합니다. Croco 팀이 직접 평가합니다.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      </head>
      <body className={`${pretendardFont.className} min-h-screen antialiased`}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 pb-12">{children}</main>
          <footer className="border-t border-border bg-background">
            <div className="page-shell flex flex-col gap-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <p>iOS 26 대응 앱을 티어별로 정리합니다.</p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/">랭킹</Link>
                <Link href="/apps">모두 보기</Link>
                <Link href="/new">새로운 앱</Link>
                <a href="https://slashpage.com/croco/xjqy1g2v9dnjvm6vd54z" target="_blank" rel="noopener noreferrer">
                  평가 기준
                </a>
              </div>
            </div>
          </footer>
        </div>
        <Toaster />
        <Script async src="https://analytics.ahrefs.com/analytics.js" data-key="19qS6SoXo5c041VRvZmh7g" />
      </body>
    </html>
  );
}
