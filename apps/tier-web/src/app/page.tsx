import { TierTabs } from '@/components/TierTabs';
import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import {
  APPS_PAGE_SIZE,
  type AppListItem,
  type AppListRow,
  compareHomeApps,
  getAppsPageRange,
  getHasNextPage,
  HOME_APPS_SELECT,
  HOME_TIERED_APPS_SELECT,
  mapAppListRow,
  mergeHomeApps,
} from './home-app-list';
import HomeAppsClient from './HomeAppsClient';

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata: Metadata = {
  title: '홈',
  description:
    'iOS 26 Liquid Glass를 대응하는 앱들을 티어별로 확인하세요. 1티어는 Liquid Glass 가이드라인을 완벽히 준수하는 앱, 2티어는 어느 정도 준수하는 앱, 3티어는 일부 대응한 앱입니다.',
  openGraph: {
    title: '다른티어 - iOS 26 Liquid Glass 대응 앱 분류',
    description: 'iOS 26 Liquid Glass를 대응하는 앱들을 티어별로 확인하세요. Croco 팀이 직접 분류합니다.',
  },
};

export const revalidate = 3600;

async function fetchHomeAppsPage({ page, tier }: { page: number; tier: number }) {
  const { from, to } = getAppsPageRange(page, APPS_PAGE_SIZE);

  if (tier === 0) {
    const requestedItemCount = page * APPS_PAGE_SIZE;
    const untieredRangeEnd = requestedItemCount - 1;

    const [tierZeroResult, unassignedResult] = await Promise.all([
      supabase
        .from('apps')
        .select(HOME_TIERED_APPS_SELECT, { count: 'exact' })
        .eq('tiers.tier', 0)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(0, untieredRangeEnd),
      supabase
        .from('apps')
        .select(HOME_APPS_SELECT, { count: 'exact' })
        .is('tiers', null)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(0, untieredRangeEnd),
    ]);

    if (tierZeroResult.error) {
      throw tierZeroResult.error;
    }

    if (unassignedResult.error) {
      throw unassignedResult.error;
    }

    const mergedApps = mergeHomeApps([
      (tierZeroResult.data as AppListRow[] | null)?.map(mapAppListRow) ?? [],
      (unassignedResult.data as AppListRow[] | null)?.map(mapAppListRow) ?? [],
    ]);
    const totalCount = (tierZeroResult.count ?? 0) + (unassignedResult.count ?? 0);

    return {
      apps: mergedApps.slice(from, to + 1),
      totalCount,
      hasNextPage: getHasNextPage(totalCount, to),
    };
  }

  const { data, error, count } = await supabase
    .from('apps')
    .select(HOME_TIERED_APPS_SELECT, { count: 'exact' })
    .eq('tiers.tier', tier)
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) {
    throw error;
  }

  const apps = (data as AppListRow[] | null)?.map(mapAppListRow) ?? [];
  apps.sort(compareHomeApps);

  return {
    apps,
    totalCount: count ?? 0,
    hasNextPage: getHasNextPage(count ?? 0, to),
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const currentTier = typeof resolvedSearchParams.tier === 'string' ? resolvedSearchParams.tier : '1';
  const parsedTier = Number.parseInt(currentTier, 10);
  const tier = Number.isNaN(parsedTier) ? 1 : parsedTier;
  let initialApps: AppListItem[] = [];
  let initialTotalCount = 0;
  let initialHasNextPage = false;

  try {
    const firstPage = await fetchHomeAppsPage({ page: 1, tier });

    initialApps = firstPage.apps;
    initialTotalCount = firstPage.totalCount;
    initialHasNextPage = firstPage.hasNextPage;
  } catch (error) {
    console.error('Error fetching apps:', error);
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
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <div className="page-shell py-8 md:py-10">
        <section className="space-y-5 border-b border-border pb-6 md:pb-8">
          <div className="space-y-2">
            <p className="section-label">다른티어 랭킹</p>
            <h1 className="editorial-display text-[1.9rem] text-foreground md:text-[2.2rem]">
              iOS 26 Liquid Glass 대응 앱
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-[15px]">
              Croco 팀이 직접 살펴본 앱을 티어별로 정리했습니다.
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
          />
        </section>
      </div>
    </>
  );
}
