'use client';

import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';
import { LoaderCircle, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  APPS_PAGE_SIZE,
  APPS_SELECT,
  type AppListItem,
  type AppListRow,
  buildAppsSearchFilter,
  getAppsPageRange,
  getHasNextPage,
  mapAppListRow,
  normalizeAppsSearchTerm,
} from './app-list';

const SEARCH_DEBOUNCE_MS = 250;
const LOAD_MORE_ROOT_MARGIN = '320px 0px';

const supabase = createClient();

type AppsPageResult = {
  apps: AppListItem[];
  totalCount: number;
  hasNextPage: boolean;
};

async function fetchAppsPage({ page, searchTerm }: { page: number; searchTerm: string }): Promise<AppsPageResult> {
  const normalizedSearchTerm = normalizeAppsSearchTerm(searchTerm);
  const { from, to } = getAppsPageRange(page, APPS_PAGE_SIZE);

  let queryBuilder = supabase
    .from('apps')
    .select(APPS_SELECT, { count: 'exact' })
    .order('name', { ascending: true })
    .order('id', { ascending: true });

  if (normalizedSearchTerm) {
    queryBuilder = queryBuilder.or(buildAppsSearchFilter(normalizedSearchTerm));
  }

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const totalCount = count ?? 0;

  return {
    apps: (data as AppListRow[] | null)?.map(mapAppListRow) ?? [],
    totalCount,
    hasNextPage: getHasNextPage(totalCount, to),
  };
}

interface AppsClientProps {
  initialApps: AppListItem[];
  initialTotalCount: number;
  initialHasNextPage: boolean;
}

export default function AppsClient({ initialApps, initialTotalCount, initialHasNextPage }: AppsClientProps) {
  const [apps, setApps] = useState<AppListItem[]>(initialApps);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [requestedTerm, setRequestedTerm] = useState('');
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
    debouncedSearchTerm !== requestedTerm ||
    initialSnapshot.apps !== initialApps ||
    initialSnapshot.totalCount !== initialTotalCount ||
    initialSnapshot.hasNextPage !== initialHasNextPage
  ) {
    setInitialSnapshot({
      apps: initialApps,
      totalCount: initialTotalCount,
      hasNextPage: initialHasNextPage,
    });
    setRequestedTerm(debouncedSearchTerm);
    setQueryError(null);
    setLoadMoreError(null);
    setIsRefreshing(Boolean(debouncedSearchTerm));
    if (!debouncedSearchTerm) {
      setApps(initialApps);
      setTotalCount(initialTotalCount);
      setCurrentPage(1);
      setHasNextPage(initialHasNextPage);
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
    if (!requestedTerm) {
      return;
    }

    const requestId = activeRequestIdRef.current;
    let isActive = true;

    void fetchAppsPage({ page: 1, searchTerm: requestedTerm })
      .then(nextPage => {
        if (!isActive || requestId !== activeRequestIdRef.current) {
          return;
        }

        setApps(nextPage.apps);
        setTotalCount(nextPage.totalCount);
        setCurrentPage(1);
        setHasNextPage(nextPage.hasNextPage);
      })
      .catch((error: unknown) => {
        if (!isActive || requestId !== activeRequestIdRef.current) {
          return;
        }

        setApps([]);
        setTotalCount(0);
        setCurrentPage(1);
        setHasNextPage(false);
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
  }, [requestedTerm, initialSnapshot]);

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || isRefreshing || !hasNextPage || queryError) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    const requestId = activeRequestIdRef.current;
    const nextPageNumber = currentPage + 1;

    try {
      const nextPage = await fetchAppsPage({
        page: nextPageNumber,
        searchTerm: debouncedSearchTerm,
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
  }, [currentPage, debouncedSearchTerm, hasNextPage, isRefreshing, queryError]);

  useEffect(() => {
    const triggerElement = loadMoreTriggerRef.current;

    if (!triggerElement || !hasNextPage || isRefreshing || queryError) {
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
  }, [hasNextPage, isRefreshing, loadMore, queryError]);

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
          {!isRefreshing && apps.length === 0 && (
            <Card variant="default" className="col-span-full p-8 text-center">
              <p className="text-sm text-muted-foreground">{queryError ?? '검색 결과가 없습니다.'}</p>
            </Card>
          )}
        </div>

        {isRefreshing && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            <span>검색 결과를 불러오는 중입니다.</span>
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
