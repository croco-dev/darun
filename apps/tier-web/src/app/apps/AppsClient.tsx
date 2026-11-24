'use client';

import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';
import { LoaderCircle, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type AppListItem, type AppsCursor, appendNewApps, fetchAppsPage, normalizeAppsSearchTerm } from './app-list';

const SEARCH_DEBOUNCE_MS = 250;
const LOAD_MORE_ROOT_MARGIN = '320px 0px';

const supabase = createClient();

interface AppsClientProps {
  initialApps: AppListItem[];
  initialTotalCount: number;
  initialNextCursor: AppsCursor | null;
}

export default function AppsClient({ initialApps, initialTotalCount, initialNextCursor }: Readonly<AppsClientProps>) {
  const [apps, setApps] = useState<AppListItem[]>(initialApps);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const hasNextPage = nextCursor !== null;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [requestedTerm, setRequestedTerm] = useState('');
  const [searchRetry, setSearchRetry] = useState(0);
  const [initialSnapshot, setInitialSnapshot] = useState({
    apps: initialApps,
    totalCount: initialTotalCount,
    nextCursor: initialNextCursor,
  });
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const activeRequestIdRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const hasUserScrolledRef = useRef(false);

  if (
    debouncedSearchTerm !== requestedTerm ||
    initialSnapshot.apps !== initialApps ||
    initialSnapshot.totalCount !== initialTotalCount ||
    initialSnapshot.nextCursor !== initialNextCursor
  ) {
    setInitialSnapshot({
      apps: initialApps,
      totalCount: initialTotalCount,
      nextCursor: initialNextCursor,
    });
    setRequestedTerm(debouncedSearchTerm);
    setQueryError(null);
    setLoadMoreError(null);
    setIsLoadingMore(false);
    setIsRefreshing(Boolean(debouncedSearchTerm));
    if (!debouncedSearchTerm) {
      setApps(initialApps);
      setTotalCount(initialTotalCount);
      setNextCursor(initialNextCursor);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(normalizeAppsSearchTerm(searchTerm));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    const handleScroll = () => {
      hasUserScrolledRef.current = true;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    activeRequestIdRef.current += 1;
    isLoadingMoreRef.current = false;
    if (!requestedTerm) {
      return;
    }

    const requestId = activeRequestIdRef.current;
    let isActive = true;

    void fetchAppsPage(supabase, { searchTerm: requestedTerm })
      .then(nextPage => {
        if (!isActive || requestId !== activeRequestIdRef.current) {
          return;
        }

        setApps(nextPage.apps);
        setTotalCount(nextPage.totalCount ?? 0);
        setNextCursor(nextPage.nextCursor);
        setQueryError(null);
      })
      .catch((error: unknown) => {
        if (!isActive || requestId !== activeRequestIdRef.current) {
          return;
        }

        setApps([]);
        setTotalCount(0);
        setNextCursor(null);
        setQueryError(error instanceof Error ? error.message : '앱 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!isActive || requestId !== activeRequestIdRef.current) {
          return;
        }

        setIsRefreshing(false);
      });

    return () => {
      isActive = false;
    };
  }, [requestedTerm, initialSnapshot, searchRetry]);

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || isRefreshing || !nextCursor || queryError) {
      return;
    }

    isLoadingMoreRef.current = true;
    hasUserScrolledRef.current = false;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    const requestId = activeRequestIdRef.current;

    try {
      const nextPage = await fetchAppsPage(supabase, {
        after: nextCursor,
        searchTerm: debouncedSearchTerm,
      });

      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      setApps(currentApps => appendNewApps(currentApps, nextPage.apps));
      setTotalCount(currentCount => nextPage.totalCount ?? currentCount);
      setNextCursor(nextPage.nextCursor);
    } catch (error: unknown) {
      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      setLoadMoreError(error instanceof Error ? error.message : '다음 앱 목록을 불러오지 못했습니다.');
    } finally {
      if (requestId === activeRequestIdRef.current) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [debouncedSearchTerm, isRefreshing, nextCursor, queryError]);

  useEffect(() => {
    const triggerElement = loadMoreTriggerRef.current;

    if (!triggerElement || !hasNextPage || isRefreshing || queryError || loadMoreError) {
      return;
    }

    let isInitialObservation = true;
    const observer = new IntersectionObserver(
      entries => {
        if (isInitialObservation) {
          isInitialObservation = false;
          return;
        }
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
  }, [hasNextPage, isRefreshing, loadMore, queryError, loadMoreError]);

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="space-y-4 border-b border-border pb-6 md:pb-8">
        <div className="space-y-2">
          <p className="section-label">전체 앱</p>
          <h1 className="editorial-display text-[1.9rem] text-foreground md:text-[2.2rem]">모든 앱 보기</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-[15px]">
            앱 이름이나 설명으로 바로 찾을 수 있습니다.
          </p>
        </div>

        <Card variant="default" className="gap-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="앱 이름 또는 설명 검색"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">총 {totalCount}개 결과</p>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">결과</h2>
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
          {(queryError || (!isRefreshing && apps.length === 0)) && (
            <Card variant="default" className="col-span-full p-8 text-center">
              <p className="text-sm text-muted-foreground">{queryError ?? '검색 결과가 없습니다.'}</p>
              {queryError && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isRefreshing || normalizeAppsSearchTerm(searchTerm) !== requestedTerm}
                  onClick={() => {
                    if (isRefreshing || !requestedTerm || normalizeAppsSearchTerm(searchTerm) !== requestedTerm) return;
                    setIsRefreshing(true);
                    setSearchRetry(value => value + 1);
                  }}
                >
                  다시 시도
                </Button>
              )}
            </Card>
          )}
        </div>

        {isRefreshing && (
          <div role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            <span>검색 결과를 불러오는 중입니다.</span>
          </div>
        )}

        {apps.length > 0 && (
          <>
            <div ref={loadMoreTriggerRef} className="h-1" aria-hidden="true" />
            <div className="flex flex-col items-center gap-3 py-4">
              {isLoadingMore && (
                <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
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
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoadingMore || isRefreshing}
                  onClick={() => void loadMore()}
                >
                  {isLoadingMore ? '불러오는 중…' : '앱 더 보기'}
                </Button>
              )}

              {!hasNextPage && !loadMoreError && !isRefreshing && (
                <p className="text-sm text-muted-foreground">모든 앱을 불러왔습니다.</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
