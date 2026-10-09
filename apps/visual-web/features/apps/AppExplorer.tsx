'use client';

import { Button } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useRef } from 'react';
import { ExplorerShell } from '../explorer/ExplorerShell';
import { AppExplorerState, AppCard, useAppExplorer } from './useAppExplorer';

const DEFAULT_ICON = '/images/default-product-icon.svg';

function AppCardGrid({ cards }: { cards: AppCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(card => (
        <li key={card.id}>
          <Link
            href={`/apps/${encodeURIComponent(card.slug)}`}
            className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-dark-150 bg-white p-4 shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <img
              src={card.logoUrl || DEFAULT_ICON}
              alt={`${card.name} 로고`}
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-xl border border-dark-150 bg-surface-100 object-cover"
            />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-bold text-dark-900">{card.name}</span>
              {card.summary.trim().length > 0 && (
                <span className="line-clamp-2 text-xs leading-relaxed text-dark-500">{card.summary}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AppCardSkeletons() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 rounded-2xl border border-dark-150 bg-white p-4">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-surface-200 motion-reduce:animate-none" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
            <div className="h-3 w-full animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ul>
  );
}

const View = (props: AppExplorerState) => {
  const {
    loading,
    networkError,
    queryLengthError,
    cards,
    searchInput,
    query,
    totalCount,
    hasFilters,
    onSearchInputChange,
    onSearchSubmit,
    onClearFilters,
    retry,
  } = props;
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <ExplorerShell
      state={{
        loading,
        queryLengthError,
        networkError,
        cards,
        totalCount,
        hasNextPage: false,
        loadingMore: false,
        loadMoreError: false,
        hasFilters,
        onClearFilters,
        onLoadMore: () => {},
        retry,
      }}
      hero={
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-dark-900 break-words [word-break:keep-all] md:text-3xl">
            앱으로 탐색하세요
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-dark-500 break-words [word-break:keep-all] md:text-base">
            서비스별로 모은 화면과 플로를 앱 상세에서 한 번에 살펴보세요.
          </p>
        </header>
      }
      searchForm={
        <form onSubmit={onSearchSubmit} className="flex flex-col gap-3" role="search">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md">
              <label htmlFor="app-search" className="text-sm font-semibold text-dark-700">
                앱 검색
              </label>
              <input
                ref={searchInputRef}
                id="app-search"
                type="search"
                autoComplete="off"
                value={searchInput}
                onChange={event => onSearchInputChange(event.currentTarget.value)}
                placeholder="서비스명으로 검색"
                data-visual-search="apps"
                className="w-full rounded-xl border border-dark-150 bg-white px-3.5 py-2.5 text-sm text-dark-900 shadow-2xs placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
              />
            </div>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="md"
              className="shrink-0 active:scale-[0.98] motion-reduce:transform-none"
            >
              <span className="whitespace-nowrap">검색</span>
            </Button>
            {query !== null && (
              <p className="w-full text-xs text-dark-400" aria-live="polite">
                ‘{query}’ 검색 결과
              </p>
            )}
          </div>
        </form>
      }
      skeleton={<AppCardSkeletons />}
      grid={<AppCardGrid cards={cards} />}
      resourceName="앱"
      unitName="개의 앱"
    />
  );
};

const BoundAppExplorer = bind<{}, AppExplorerState>(() => useAppExplorer(), View, {
  displayName: 'AppExplorer',
});

export function AppExplorer() {
  return <BoundAppExplorer />;
}
