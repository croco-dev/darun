'use client';

import { Button } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useRef } from 'react';
import { SaveButton } from '../collections/SaveButton';
import { ExplorerShell } from '../explorer/ExplorerShell';
import { VISUAL_CARD_IMAGE_LOADING } from '../perf/imageLoading';
import { ProductSearchSuggest } from '../product-search/ProductSearchSuggest';
import { CatalogPagination } from './CatalogPagination';
import { AppExplorerState, AppCard, useAppExplorer } from './useAppExplorer';

const DEFAULT_ICON = '/images/default-product-icon.svg';

function AppCardGrid({ cards }: { cards: AppCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2">
      {cards.map(card => (
        <li key={card.id} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={`/apps/${encodeURIComponent(card.slug)}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
              >
                <img
                  src={card.logoUrl || DEFAULT_ICON}
                  alt=""
                  aria-hidden="true"
                  loading={VISUAL_CARD_IMAGE_LOADING}
                  className="h-9 w-9 shrink-0 rounded-lg border border-dark-100 bg-surface-100 object-cover"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-dark-900">{card.name}</span>
                  <span className="block text-xs text-dark-500 tabular-nums">화면 {card.screenshotCount}개</span>
                </span>
              </Link>
              <SaveButton
                item={{
                  kind: 'app',
                  id: card.id,
                  title: card.name,
                  imageUrl: card.logoUrl || DEFAULT_ICON,
                  href: `/apps/${encodeURIComponent(card.slug)}`,
                  productName: card.name,
                }}
              />
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {card.screenshots.map(screenshot => (
                <li key={screenshot.id} className="min-w-0">
                  <Link
                    href={`/screenshots/${encodeURIComponent(screenshot.id)}`}
                    className="block overflow-hidden rounded-lg border border-dark-100 bg-surface-50 transition-colors hover:border-dark-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                  >
                    <img
                      src={screenshot.imageUrl}
                      alt={screenshot.imageAlt || screenshot.title || `${card.name} 화면`}
                      loading={VISUAL_CARD_IMAGE_LOADING}
                      className="aspect-[9/19.5] w-full object-contain object-top"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AppCardSkeletons() {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex min-w-0 flex-col gap-3">
          <div className="h-9 w-1/2 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }, (_, preview) => (
              <div
                key={preview}
                className="aspect-[9/19.5] animate-pulse rounded-lg bg-surface-100 motion-reduce:animate-none"
              />
            ))}
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
    suggestions,
    isSearchingSuggestions,
    onSuggestionSelect,
    onSuggestClose,
    onSearchInputFocus,
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
      hero={<h1 className="sr-only">앱</h1>}
      searchForm={
        <form onSubmit={onSearchSubmit} role="search" className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="app-search" className="sr-only">
                앱 검색
              </label>
              <input
                ref={searchInputRef}
                id="app-search"
                type="search"
                autoComplete="off"
                aria-expanded={suggestions.length > 0 || (searchInput.trim().length > 0 && isSearchingSuggestions)}
                aria-controls="app-search-suggest-listbox"
                value={searchInput}
                onChange={event => onSearchInputChange(event.currentTarget.value)}
                onFocus={onSearchInputFocus}
                placeholder="서비스명으로 검색"
                data-visual-search="apps"
                aria-describedby={query !== null ? 'app-search-status' : undefined}
                className="min-h-[44px] w-full rounded-lg border border-dark-150 bg-white px-3 py-2 text-sm text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
              />
              <ProductSearchSuggest
                inputId="app-search"
                inputRef={searchInputRef}
                inputValue={searchInput}
                suggestions={suggestions}
                isSearching={isSearchingSuggestions}
                onSelect={onSuggestionSelect}
                onClose={onSuggestClose}
              />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="md"
                className="min-h-[44px] shrink-0 active:scale-[0.98] motion-reduce:transform-none"
              >
                <span className="whitespace-nowrap">검색</span>
              </Button>
              {hasFilters && (
                <Button
                  type="button"
                  variant="text"
                  color="primary"
                  size="md"
                  onClick={onClearFilters}
                  className="min-h-[44px] shrink-0 active:scale-[0.98] motion-reduce:transform-none"
                >
                  <span className="whitespace-nowrap">초기화</span>
                </Button>
              )}
            </div>
          </div>
          <p id="app-search-status" className={query !== null ? 'text-xs text-dark-600' : 'sr-only'} aria-live="polite">
            {query !== null && !loading && !networkError ? `‘${query}’ 검색 결과 ${totalCount}개` : ''}
          </p>
        </form>
      }
      skeleton={<AppCardSkeletons />}
      grid={<AppCardGrid cards={cards} />}
      children={<CatalogPagination {...props.pagination} />}
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
