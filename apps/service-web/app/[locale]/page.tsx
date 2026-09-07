import { gql } from "@apollo/client";
import {
  CategoryNavigationSection,
  MainHeroBanner,
  RecentProductSection,
  TrendingProductSection,
} from "@darun/products-shell";
import { CategoryNavigationSkeleton } from "@darun/products-shell/src/shells/CategoryNavigationSection/CategoryNavigationSkeleton";
import { RecentProductSkeleton } from "@darun/products-shell/src/shells/RecentProductSection/RecentProductSkeleton";
import { TrendingProductSkeleton } from "@darun/products-shell/src/shells/TrendingProductSection/TrendingProductSkeleton";
import {
  Compass,
  Layers,
  SectionHeader,
  SectionWrapper,
  ShieldCheck,
} from "@darun/ui";
import { Layout } from "@darun/ui-layout";

import { Metadata } from "next";
import { Suspense } from "react";
import { JsonLd } from "../../lib/seo/json-ld";
import { buildHomePageMetadata } from "../../lib/seo/metadata";
import { normalizeLocale } from "../../lib/seo/url";
import { getClient } from "../getServerClient";

const productsCountQuery = gql`
  query ProductsCountOnHomePage {
    productsCount
  }
`;

export const revalidate = 3600;

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildHomePageMetadata(normalizeLocale(locale));
}

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.darun.io/#website",
  url: "https://www.darun.io/",
  name: "다른(darun)",
  alternateName: ["darun", "darun.io", "다른"],
};

const whatIsDarunFeatures = [
  {
    icon: Compass,
    iconColor: "border-amber-500/20 bg-amber-500/10 text-amber-600",
    titleKo: "서비스 탐색과 나란한 비교",
    titleEn: "Discovery and Comparison",
    descKo:
      "다른(darun)은 업무와 프로젝트에 필요한 다양한 소프트웨어, 웹 서비스, 생산성 도구들을 탐색할 수 있는 공간입니다. 카테고리별로 분류된 서비스 목록과 커뮤니티 투표 기반 랭킹을 통해 검증된 인기 도구들을 한눈에 확인하세요.",
    descEn:
      "Darun is designed to help individuals and teams explore digital products across various categories. Browse verified tools and popular software ranked by real community feedback to find what fits your needs.",
  },
  {
    icon: Layers,
    iconColor: "border-blue-500/20 bg-blue-500/10 text-blue-600",
    titleKo: "상세 정보와 대안 추천",
    titleEn: "In-Depth Details & Alternatives",
    descKo:
      "각 상품 상세 페이지에서는 서비스의 핵심 기능, 태그, 개발사 정보뿐 아니라 함께 고려할 수 있는 대안 서비스(Alternatives)를 엄선하여 제공합니다. 특정 도구의 아쉬운 점을 보완할 대체재를 쉽게 비교할 수 있습니다.",
    descEn:
      "Each product page highlights key features, company background, and carefully curated alternatives. If a tool lacks a specific workflow feature, explore recommended alternatives side-by-side.",
  },
  {
    icon: ShieldCheck,
    iconColor: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    titleKo: "공식 링크 및 최신성 확인",
    titleEn: "Verified Links & Freshness",
    descKo:
      "소프트웨어 기능과 요금제는 수시로 업데이트되므로, 페이지 내에 제공되는 외부 공식 서비스 링크를 통해 최신 공식 출처를 함께 확인하시기 바랍니다. 다른(darun)은 광고성 조작 없이 객관적 탐색을 지원합니다.",
    descEn:
      "Software specifications and pricing tiers evolve over time. We provide verified official external links on every product page so you can easily verify the latest details directly from primary sources.",
  },
];

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const currentLocale = normalizeLocale(locale);
  const isKo = currentLocale === "ko";

  const { data } = await getClient({ static: true }).query<{
    productsCount: number;
  }>({
    query: productsCountQuery,
  });

  if (!data) {
    throw new Error("Products count query returned no data");
  }

  const productsCount = data.productsCount;

  return (
    <Layout>
      <JsonLd data={webSiteJsonLd} />
      <main data-testid="home-page" className="flex flex-col">
        <MainHeroBanner productsCount={productsCount} />
        <Suspense fallback={<CategoryNavigationSkeleton />}>
          <CategoryNavigationSection />
        </Suspense>
        <Suspense fallback={<TrendingProductSkeleton />}>
          <TrendingProductSection />
        </Suspense>
        <Suspense fallback={<RecentProductSkeleton />}>
          <RecentProductSection />
        </Suspense>
        <SectionWrapper background="subtle" spacing="md">
          <div className="flex flex-col gap-6">
            <SectionHeader
              title={
                isKo ? "다른(darun)은 어떤 서비스인가요?" : "What is Darun?"
              }
              subtitle={
                isKo
                  ? "팀과 개인이 최고의 소프트웨어를 찾고, 나란히 비교하며, 직접 평가하는 플랫폼입니다"
                  : "A curated platform to discover, compare, and evaluate the right software for your workflow"
              }
            />
            <div className="grid grid-cols-1 gap-5 text-sm leading-relaxed text-dark-700 md:grid-cols-3 md:gap-6 sm:text-base">
              {whatIsDarunFeatures.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.titleEn}
                    className="flex flex-col gap-3 rounded-card-lg border border-dark-150 bg-white p-6 shadow-card"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${item.iconColor}`}
                    >
                      <Icon size={22} />
                    </div>
                    <h3 className="text-base font-bold tracking-tight text-dark-900 sm:text-lg">
                      {isKo ? item.titleKo : item.titleEn}
                    </h3>
                    <p className="text-sm leading-relaxed text-dark-600">
                      {isKo ? item.descKo : item.descEn}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionWrapper>
      </main>
    </Layout>
  );
}
