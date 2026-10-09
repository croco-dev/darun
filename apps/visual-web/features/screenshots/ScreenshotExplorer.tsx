'use client';

import { Button } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useRef } from 'react';
import { ExplorerShell } from '../explorer/ExplorerShell';
import { ProductSearchSuggest } from '../product-search/ProductSearchSuggest';
import { VISUAL_CARD_IMAGE_LOADING } from '../perf/imageLoading';
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
                alt={
                  card.imageAlt ||
                  card.title ||
                  (card.product.name ? `${card.product.name} 스크린샷` : '스크린샷 이미지')
                }
                loading={VISUAL_CARD_IMAGE_LOADING}
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
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

const View = (props: ScreenshotExplorerState & { hideHero?: boolean }) => {
  const {
    cards,
    searchInput,
    platform,
    screenType,
    product,
    onSearchInputChange,
    onSearchSubmit,
    onPlatformChange,
    onScreenTypeChange,
    onClearFilters,
    suggestions,
    isSearchingSuggestions,
    onSuggestionSelect,
    onSuggestClose,
    onSearchInputFocus,
    hideHero,
  } = props;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasFilters = searchInput.trim().length > 0 || platform !== null || screenType !== null || product !== null;

  return (
    <ExplorerShell
      state={{ ...props, hasFilters }}
      hero={
        hideHero !== true ? (
          <header className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-dark-900 break-words [word-break:keep-all] md:text-3xl">
              디자인과 UX를 화면으로 탐색하세요
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-dark-500 break-words [word-break:keep-all] md:text-base">
              다른 팀이 손수 등록한 서비스 화면을 검색하고, 플랫폼과 화면 유형으로 나누어 살펴보세요.
            </p>
          </header>
        ) : (
          <h1 className="sr-only">화면 탐색</h1>
        )
      }
      searchForm={
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
                data-visual-search="screenshots"
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
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="md"
              className="shrink-0 active:scale-[0.98] motion-reduce:transform-none"
            >
              <span className="whitespace-nowrap">검색</span>
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
                className="min-h-[44px] cursor-pointer rounded-xl border border-dark-150 bg-white px-3 py-2.5 text-sm text-dark-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-dark-900/60"
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
                className="min-h-[44px] cursor-pointer rounded-xl border border-dark-150 bg-white px-3 py-2.5 text-sm text-dark-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-dark-900/60"
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
                <Button
                  variant="shadow"
                  color="primary"
                  size="sm"
                  onClick={() => onClearFilters()}
                  className="active:scale-[0.98] motion-reduce:transform-none"
                >
                  <span className="max-w-48 truncate">{product}</span>
                  <span aria-hidden="true" className="ml-1 font-bold">
                    ×
                  </span>
                  <span className="sr-only">서비스 필터 해제</span>
                </Button>
              </div>
            )}
          </div>
        </form>
      }
      skeleton={<ScreenshotCardSkeletons />}
      grid={<ScreenshotCardGrid cards={cards} />}
      resourceName="스크린샷"
      unitName="개의 화면"
    />
  );
};

const BoundScreenshotExplorer = bind<{ hideHero?: boolean }, ScreenshotExplorerState & { hideHero?: boolean }>(
  props => ({ ...useScreenshotExplorer(), hideHero: props.hideHero }),
  View,
  {
    displayName: 'ScreenshotExplorer',
  }
);

export function ScreenshotExplorer({ hideHero }: { hideHero?: boolean }) {
  return <BoundScreenshotExplorer hideHero={hideHero} />;
}
