'use client';

import { Button, ImageOff, RefreshCw } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useRef } from 'react';
import { ProductSearchSuggest } from '../product-search/ProductSearchSuggest';
import { ScreenshotExplorerState, ScreenshotCard, useScreenshotExplorer } from './useScreenshotExplorer';
import {
  UNCLASSIFIED_LABEL,
  VISUAL_PLATFORM_LABELS,
  VISUAL_PLATFORM_OPTIONS,
  VISUAL_SCREEN_TYPE_LABELS,
  VISUAL_SCREEN_TYPE_OPTIONS,
  isVisualPlatformValue,
  isVisualScreenTypeValue,
} from './visualClassifications';

function ScreenshotCardGrid({ cards }: { cards: ScreenshotCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(card => (
        <li key={card.id}>
          <Link
            href={`/screenshots/${encodeURIComponent(card.id)}`}
            className="group block overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-surface-100">
              <img
                src={card.imageUrl}
                alt={card.imageAlt}
                loading="lazy"
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="flex flex-col gap-1 p-3.5">
              <span className="truncate text-sm font-bold text-dark-900">{card.title ?? card.imageAlt}</span>
              <span className="flex items-center gap-2 text-xs text-dark-500">
                <span className="truncate">{card.product.name}</span>
                <span aria-hidden="true" className="text-dark-300">
                  ·
                </span>
                <span className="shrink-0">
                  {card.platform && isVisualPlatformValue(card.platform)
                    ? VISUAL_PLATFORM_LABELS[card.platform]
                    : UNCLASSIFIED_LABEL}
                </span>
                <span aria-hidden="true" className="text-dark-300">
                  ·
                </span>
                <span className="shrink-0">
                  {card.screenType && isVisualScreenTypeValue(card.screenType)
                    ? VISUAL_SCREEN_TYPE_LABELS[card.screenType]
                    : UNCLASSIFIED_LABEL}
                </span>
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ScreenshotCardSkeletons() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-2xl border border-dark-150 bg-white">
          <div className="aspect-[4/3] w-full animate-pulse bg-surface-200 motion-reduce:animate-none" />
          <div className="flex flex-col gap-2 p-3.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ul>
  );
}

const View = ({
  loading,
  queryLengthError,
  networkError,
  cards,
  totalCount,
  hasNextPage,
  loadingMore,
  loadMoreError,
  searchInput,
  platform,
  screenType,
  product,
  onSearchInputChange,
  onSearchSubmit,
  onPlatformChange,
  onScreenTypeChange,
  onClearFilters,
  onLoadMore,
  retry,
  suggestions,
  isSearchingSuggestions,
  onSuggestionSelect,
  onSuggestClose,
  onSearchInputFocus,
}: ScreenshotExplorerState) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasFilters = searchInput.trim().length > 0 || platform !== null || screenType !== null || product !== null;

  return (
    <main id="main-content" className="w-full py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:gap-10 md:px-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-dark-900 md:text-3xl">
            디자인과 UX를 화면으로 탐색하세요
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-dark-500 md:text-base">
            다른 팀이 손수 등록한 서비스 화면을 검색하고, 플랫폼과 화면 유형으로 나누어 살펴보세요.
          </p>
        </header>

        <form onSubmit={onSearchSubmit} className="flex flex-col gap-3" role="search">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md">
              <label htmlFor="screenshot-search" className="text-sm font-semibold text-dark-700">
                스크린샷 검색
              </label>
              <input
                ref={searchInputRef}
                id="screenshot-search"
                type="search"
                autoComplete="off"
                aria-expanded={suggestions.length > 0 || (searchInput.trim().length > 0 && isSearchingSuggestions)}
                aria-controls="screenshot-search-suggest-listbox"
                value={searchInput}
                onChange={event => onSearchInputChange(event.currentTarget.value)}
                onFocus={onSearchInputFocus}
                placeholder="서비스명, 화면 제목, 설명으로 검색"
                className="w-full rounded-xl border border-dark-150 bg-white px-3.5 py-2.5 text-sm text-dark-900 shadow-2xs placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
              />
              <ProductSearchSuggest
                inputId="screenshot-search"
                inputRef={searchInputRef}
                inputValue={searchInput}
                suggestions={suggestions}
                isSearching={isSearchingSuggestions}
                onSelect={onSuggestionSelect}
                onClose={onSuggestClose}
              />
            </div>
            <Button type="submit" variant="contained" color="primary" size="md">
              검색
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="screenshot-platform" className="text-sm font-semibold text-dark-700">
                플랫폼
              </label>
              <select
                id="screenshot-platform"
                value={platform ?? ''}
                onChange={event => onPlatformChange(event.currentTarget.value)}
                className="rounded-xl border border-dark-150 bg-white px-3 py-2.5 text-sm text-dark-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-dark-900/60"
              >
                <option value="">전체</option>
                {VISUAL_PLATFORM_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="screenshot-screen-type" className="text-sm font-semibold text-dark-700">
                화면 유형
              </label>
              <select
                id="screenshot-screen-type"
                value={screenType ?? ''}
                onChange={event => onScreenTypeChange(event.currentTarget.value)}
                className="rounded-xl border border-dark-150 bg-white px-3 py-2.5 text-sm text-dark-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-dark-900/60"
              >
                <option value="">전체</option>
                {VISUAL_SCREEN_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {product !== null && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-dark-700">서비스 화면 필터</span>
                <Button variant="shadow" color="primary" size="sm" onClick={() => onClearFilters()}>
                  <span className="max-w-48 truncate">{product}</span>
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">서비스 필터 해제</span>
                </Button>
              </div>
            )}
          </div>
        </form>

        {queryLengthError ? (
          <div role="alert" className="rounded-2xl border border-dark-200 bg-surface-50 p-6 text-center">
            <p className="text-sm font-semibold text-dark-900">검색어는 100자 이하로 입력해 주세요.</p>
            <p className="mt-1 text-sm text-dark-500">입력을 줄인 뒤 다시 검색해 주세요.</p>
          </div>
        ) : loading ? (
          <ScreenshotCardSkeletons />
        ) : networkError ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-2xl border border-dark-200 bg-surface-50 p-8 text-center"
          >
            <ImageOff size={28} className="text-dark-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-dark-900">스크린샷을 불러오지 못했어요.</p>
            <Button type="button" variant="contained" color="primary" size="sm" onClick={() => retry()}>
              <RefreshCw size={16} />
              다시 시도
            </Button>
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dark-200 bg-surface-50 p-8 text-center">
            <p className="text-sm font-semibold text-dark-900">검색 결과가 없습니다.</p>
            <p className="text-sm text-dark-500">다른 검색어나 필터로 시도해 보세요.</p>
            {hasFilters && (
              <Button type="button" variant="shadow" color="primary" size="sm" onClick={() => onClearFilters()}>
                필터 초기화
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-dark-400" aria-live="polite">
              총 {totalCount}개의 화면
            </p>
            <ScreenshotCardGrid cards={cards} />
            {hasNextPage && (
              <div className="flex flex-col items-center gap-2">
                {loadMoreError && (
                  <p role="alert" className="text-sm text-dark-500">
                    더 불러오지 못했어요. 아래 버튼으로 다시 시도해 주세요.
                  </p>
                )}
                <Button
                  type="button"
                  variant="shadow"
                  color="primary"
                  size="md"
                  onClick={() => onLoadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? '불러오는 중...' : '더 보기'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export const ScreenshotExplorer = bind(useScreenshotExplorer, View, { displayName: 'ScreenshotExplorer' });
