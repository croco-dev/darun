'use client';

import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type AppListItem, fetchHomeAppsPage } from './home-app-list';

const LOAD_MORE_ROOT_MARGIN = '320px 0px';

const supabase = createClient();

interface HomeAppsClientProps {
  initialApps: AppListItem[];
  initialTotalCount: number;
  initialHasNextPage: boolean;
  tier: number;
  initialError?: boolean;
}

export default function HomeAppsClient({
  initialApps,
  initialTotalCount,
  initialHasNextPage,
  tier,
  initialError = false,
}: HomeAppsClientProps) {
  const [apps, setApps] = useState<AppListItem[]>(initialApps);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [readFailed, setReadFailed] = useState(initialError);
  const [initialSnapshot, setInitialSnapshot] = useState({
    apps: initialApps,
    totalCount: initialTotalCount,
    hasNextPage: initialHasNextPage,
    error: initialError,
  });
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const activeRequestIdRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const hasUserScrolledRef = useRef(false);

  if (
    initialSnapshot.apps !== initialApps ||
    initialSnapshot.totalCount !== initialTotalCount ||
    initialSnapshot.hasNextPage !== initialHasNextPage ||
    initialSnapshot.error !== initialError
  ) {
    setInitialSnapshot({
      apps: initialApps,
      totalCount: initialTotalCount,
      hasNextPage: initialHasNextPage,
      error: initialError,
    });
    setApps(initialApps);
    setTotalCount(initialTotalCount);
    setCurrentPage(1);
    setHasNextPage(initialHasNextPage);
    setIsLoadingMore(false);
    setLoadMoreError(null);
    setReadFailed(initialError);
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
    if (isLoadingMoreRef.current || (!hasNextPage && !readFailed)) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    const requestId = activeRequestIdRef.current;
    const nextPageNumber = readFailed ? 1 : currentPage + 1;

    try {
      const nextPage = await fetchHomeAppsPage(supabase, {
        page: nextPageNumber,
        tier,
      });

      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      setApps(currentApps => (readFailed ? nextPage.apps : [...currentApps, ...nextPage.apps]));
      setReadFailed(false);
      setTotalCount(nextPage.totalCount);
      setCurrentPage(nextPageNumber);
      setHasNextPage(nextPage.hasNextPage);
    } catch {
      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      setLoadMoreError('앱 목록을 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [currentPage, hasNextPage, tier, readFailed]);

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
        {!readFailed && <p className="text-sm text-muted-foreground">총 {totalCount}개</p>}
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
        {!readFailed && apps.length === 0 && (
          <div className="col-span-full rounded-[var(--radius-glass-panel)] border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">이 티어에 배치된 앱이 아직 없습니다.</p>
          </div>
        )}
      </div>
      {readFailed && (
        <div role="alert" className="space-y-3 rounded-lg border border-border p-6 text-center">
          <p>앱 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
          {loadMoreError && <p className="text-sm text-destructive">{loadMoreError}</p>}
          <Button disabled={isLoadingMore} onClick={() => void loadMore()}>
            {isLoadingMore ? '불러오는 중…' : '다시 시도'}
          </Button>
        </div>
      )}

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

            {hasNextPage && !loadMoreError && (
              <Button type="button" variant="outline" disabled={isLoadingMore} onClick={() => void loadMore()}>
                {isLoadingMore ? '불러오는 중…' : '앱 더 보기'}
              </Button>
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
