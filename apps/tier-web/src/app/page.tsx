import { TierTabs } from '@/components/TierTabs';
import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import { type AppListItem, fetchHomeAppsPage, normalizeHomeTier } from './home-app-list';
import HomeAppsClient from './HomeAppsClient';

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata: Metadata = {
  title: '홈',
  description:
    '다른티어에 등록된 iOS 앱의 Liquid Glass 대응 분류를 확인하세요. 티어는 Croco 팀의 분류 기준에 따른 참고 정보입니다.',
  openGraph: {
    title: '다른티어 - iOS 26 Liquid Glass 대응 앱 분류',
    description: 'iOS 26 Liquid Glass를 대응하는 앱들을 티어별로 확인하세요. Croco 팀이 직접 분류합니다.',
  },
};

export const revalidate = 3600;

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const tier = normalizeHomeTier(resolvedSearchParams.tier);
  const currentTier = String(tier);
  let initialApps: AppListItem[] = [];
  let initialTotalCount = 0;
  let initialHasNextPage = false;
  let initialError = false;

  try {
    const firstPage = await fetchHomeAppsPage(supabase, { page: 1, tier });

    initialApps = firstPage.apps;
    initialTotalCount = firstPage.totalCount;
    initialHasNextPage = firstPage.hasNextPage;
  } catch (error) {
    console.error('Error fetching apps:', error);
    initialError = true;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tier.darun.io';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '다른티어',
    description: 'iOS 26 Liquid Glass를 대응하는 앱들을 티어별로 분류하는 서비스',
    url: siteUrl,
    publisher: {
      '@type': 'Organization',
      name: 'Croco 팀',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <div className="page-shell py-8 md:py-10">
        <section className="space-y-5 border-b border-border pb-6 md:pb-8">
          <div className="space-y-2">
            <p className="section-label">다른티어 랭킹</p>
            <h1 className="editorial-display text-[1.9rem] text-balance text-foreground md:text-[2.2rem]">
              iOS 26 Liquid Glass 대응 앱
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-[15px]">
              등록된 앱을 Croco 팀의 기준으로 분류했습니다. 티어는 공식 인증이 아닌 참고 정보입니다.
            </p>
          </div>

          <TierTabs currentTier={currentTier} />
        </section>

        <section className="pt-6 md:pt-8">
          <HomeAppsClient
            key={currentTier}
            initialApps={initialApps}
            initialHasNextPage={initialHasNextPage}
            initialTotalCount={initialTotalCount}
            tier={tier}
            initialError={initialError}
          />
        </section>
      </div>
    </>
  );
}
