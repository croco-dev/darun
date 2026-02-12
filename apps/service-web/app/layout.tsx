import "normalize.css/normalize.css";
import "./globals.css";

import { pretendardFont } from "@croco/utils-next-font-pretendard";
import { KumaRegistry } from "@kuma-ui/next-plugin/registry";
import { Metadata } from "next";
import Script from "next/script";
import { CookiesProvider } from "next-client-cookies/server";
import { ReactNode } from "react";
import { ClientRootProvider } from "./client";
import { ServerRootProvider } from "./server";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.darun.io"),
  title: "다른 - 서비스 비교를 한 곳에서",
  description:
    "다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다. 다양한 소프트웨어, 웹사이트, 어플리케이션를 검색하고 리뷰를 확인해보세요.",
  keywords: [
    "비교",
    "대안",
    "비슷한",
    "장단점",
    "다른 사이트",
    "다른 서비스",
    "다른 앱",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName: "다른(darun)",
    url: "https://www.darun.io",
    title: "다른 - 서비스 비교를 한 곳에서",
    description:
      "다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다. 다양한 소프트웨어, 웹사이트, 어플리케이션를 검색하고 리뷰를 확인해보세요.",
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: "https://darun-image.doda.dev/?format=png",
        width: 1200,
        height: 630,
        alt: "다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "다른 - 서비스 비교를 한 곳에서",
    description:
      "다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다. 다양한 소프트웨어, 웹사이트, 어플리케이션를 검색하고 리뷰를 확인해보세요.",
    images: ["https://darun-image.doda.dev/?format=png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/images/apple-touch-icon.png"
        />
        <link rel="icon" href="/images/favicon.svg" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/images/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/images/favicon-16x16.png"
        />
        <meta
          name="naver-site-verification"
          content="9df72f43242db6a7b1048dee830cef5b44e00a7a"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "다른(darun)",
              url: "https://www.darun.io",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate:
                    "https://www.darun.io/search/product?query={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className={pretendardFont.className}>
        <KumaRegistry>
          <CookiesProvider>
            <ServerRootProvider>
              <ClientRootProvider>{children}</ClientRootProvider>
            </ServerRootProvider>
          </CookiesProvider>
        </KumaRegistry>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8177584316528588"
          crossOrigin="anonymous"
          strategy={"afterInteractive"}
        />
        <Script
          async
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="19qS6SoXo5c041VRvZmh7g"
        />
      </body>
    </html>
  );
}
