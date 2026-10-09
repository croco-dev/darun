'use client';

import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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

const LOAD_MORE_ROOT_MARGIN = '320px 0px';

const supabase = createClient();

type HomeAppsPageResult = {
  apps: AppListItem[];
  totalCount: number;
  hasNextPage: boolean;
};

async function fetchHomeAppsPage({ page, tier }: { page: number; tier: number }): Promise<HomeAppsPageResult> {
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
      throw new Error(tierZeroResult.error.message);
    }

    if (unassignedResult.error) {
      throw new Error(unassignedResult.error.message);
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
    throw new Error(error.message);
  }

  const totalCount = count ?? 0;
  const apps = (data as AppListRow[] | null)?.map(mapAppListRow) ?? [];
  apps.sort(compareHomeApps);

  return {
    apps,
    totalCount,
    hasNextPage: getHasNextPage(totalCount, to),
  };
}

interface HomeAppsClientProps {
  initialApps: AppListItem[];
  initialTotalCount: number;
  initialHasNextPage: boolean;
  tier: number;
}

export default function HomeAppsClient({
  initialApps,
  initialTotalCount,
  initialHasNextPage,
  tier,
}: HomeAppsClientProps) {
  const [apps, setApps] = useState<AppListItem[]>(initialApps);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState({
    apps: initialApps,
    totalCount: initialTotalCount,
    hasNextPage: initialHasNextPage,
  });
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const activeRequestIdRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const hasUserScrolledRef = useRef(false);

  if (
    initialSnapshot.apps !== initialApps ||
    initialSnapshot.totalCount !== initialTotalCount ||
    initialSnapshot.hasNextPage !== initialHasNextPage
  ) {
    setInitialSnapshot({
      apps: initialApps,
      totalCount: initialTotalCount,
      hasNextPage: initialHasNextPage,
    });
    setApps(initialApps);
    setTotalCount(initialTotalCount);
    setCurrentPage(1);
    setHasNextPage(initialHasNextPage);
    setIsLoadingMore(false);
    setLoadMoreError(null);
  }

  useEffect(() => {
    activeRequestIdRef.current += 1;
    isLoadingMoreRef.current = false;
    hasUserScrolledRef.current = false;
  }, [initialSnapshot]);

  useEffect(() => {
    const handleScroll = () => {
      hasUserScrolledRef.current = true;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasNextPage) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    const requestId = activeRequestIdRef.current;
    const nextPageNumber = currentPage + 1;

    try {
      const nextPage = await fetchHomeAppsPage({
        page: nextPageNumber,
        tier,
      });

      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      setApps(currentApps => [...currentApps, ...nextPage.apps]);
      setTotalCount(nextPage.totalCount);
      setCurrentPage(nextPageNumber);
      setHasNextPage(nextPage.hasNextPage);
    } catch (error: unknown) {
      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      setLoadMoreError(error instanceof Error ? error.message : '다음 앱 목록을 불러오지 못했습니다.');
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [currentPage, hasNextPage, tier]);

  useEffect(() => {
    const triggerElement = loadMoreTriggerRef.current;

    if (!triggerElement || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasUserScrolledRef.current) {
          void loadMore();
        }
      },
      { root: null, rootMargin: LOAD_MORE_ROOT_MARGIN }
    );

    observer.observe(triggerElement);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, loadMore]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-foreground">목록</h2>
        <p className="text-sm text-muted-foreground">총 {totalCount}개</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {apps.map(app => (
          <AppCard
            key={app.id}
            id={app.id}
            name={app.name}
            description={app.description}
            iconUrl={app.iconUrl}
            tier={app.tier}
          />
        ))}
        {apps.length === 0 && (
          <div className="col-span-full rounded-[var(--radius-glass-panel)] border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">이 티어에 배치된 앱이 아직 없습니다.</p>
          </div>
        )}
      </div>

      {apps.length > 0 && (
        <>
          <div ref={loadMoreTriggerRef} className="h-1" aria-hidden="true" />
          <div className="flex flex-col items-center gap-3 py-4">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                <span>다음 앱 목록을 불러오는 중입니다.</span>
              </div>
            )}

            {loadMoreError && (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm text-muted-foreground">{loadMoreError}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadMore()}>
                  다시 시도
                </Button>
              </div>
            )}

            {!hasNextPage && !loadMoreError && !isLoadingMore && (
              <p className="text-sm text-muted-foreground">모든 앱을 불러왔습니다.</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
