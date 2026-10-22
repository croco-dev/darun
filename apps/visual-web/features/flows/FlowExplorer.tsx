'use client';

import { Button, Layers } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useRef } from 'react';
import { SaveButton } from '../collections/SaveButton';
import { ExplorerShell } from '../explorer/ExplorerShell';
import { VISUAL_CARD_IMAGE_LOADING } from '../perf/imageLoading';
import { ProductSearchSuggest } from '../product-search/ProductSearchSuggest';
import {
  VISUAL_PLATFORM_LABELS,
  VISUAL_PLATFORM_OPTIONS,
  VISUAL_FLOW_TYPE_LABELS,
  VISUAL_FLOW_TYPE_OPTIONS,
} from './flowClassifications';
import { FlowExplorerState, FlowCard, useFlowExplorer } from './useFlowExplorer';

function FlowCardGrid({ cards }: { cards: FlowCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
      {cards.map(card => (
        <li key={card.id} className="min-w-0">
          <Link
            href={`/flows/${encodeURIComponent(card.id)}`}
            className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-inset"
          >
            <div className="flex aspect-[4/3] w-full items-start justify-center overflow-hidden bg-surface-100">
              <img
                src={card.coverImageUrl}
                alt={card.coverImageAlt || (card.title ? `${card.title} 플로 커버 이미지` : '플로 커버 이미지')}
                loading={VISUAL_CARD_IMAGE_LOADING}
                className="h-full w-full object-contain object-top"
              />
            </div>
            <div className="flex flex-col gap-1 py-3">
              <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-dark-900">
                <Layers size={14} className="shrink-0 text-dark-400" aria-hidden="true" />
                {card.title}
              </span>
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-dark-600">
                <span className="truncate">{card.product.name}</span>
                <span aria-hidden="true" className="text-dark-300">
                  ·
                </span>
                <span className="shrink-0">{VISUAL_PLATFORM_LABELS[card.platform] ?? card.platform}</span>
                <span aria-hidden="true" className="text-dark-300">
                  ·
                </span>
                <span className="shrink-0">{VISUAL_FLOW_TYPE_LABELS[card.flowType] ?? card.flowType}</span>
              </span>
              <span className="text-xs text-dark-600 tabular-nums">{card.stepCount}단계</span>
            </div>
          </Link>
          <div className="flex items-center justify-end">
            <SaveButton
              item={{
                kind: 'flow',
                id: card.id,
                title: card.title,
                imageUrl: card.coverImageUrl,
                href: `/flows/${encodeURIComponent(card.id)}`,
                productName: card.product.name,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function FlowCardSkeletons() {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-xl border border-dark-150 bg-white">
          <div className="min-h-28 w-full animate-pulse bg-surface-200 motion-reduce:animate-none" />
          <div className="flex flex-col gap-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ul>
  );
}

const View = (props: FlowExplorerState) => {
  const {
    cards,
    searchInput,
    platform,
    flowType,
    product,
    onSearchInputChange,
    onSearchSubmit,
    onPlatformChange,
    onFlowTypeChange,
    onProductClear,
    suggestions,
    isSearchingSuggestions,
    onSuggestionSelect,
    onSuggestClose,
    onSearchInputFocus,
  } = props;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasFilters = searchInput.trim().length > 0 || platform !== null || flowType !== null || product !== null;

  return (
    <div className="w-full py-5 md:py-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 md:px-8">
        <ExplorerShell
          state={{ ...props, hasFilters }}
          hero={<h1 className="sr-only">플로우 탐색</h1>}
          searchForm={
            <form onSubmit={onSearchSubmit} role="search" className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative min-w-0 w-full lg:flex-1">
                <label htmlFor="flow-search" className="sr-only">
                  플로 검색
                </label>
                <input
                  ref={searchInputRef}
                  id="flow-search"
                  type="search"
                  autoComplete="off"
                  aria-expanded={suggestions.length > 0 || (searchInput.trim().length > 0 && isSearchingSuggestions)}
                  aria-controls="flow-search-suggest-listbox"
                  value={searchInput}
                  onChange={event => onSearchInputChange(event.currentTarget.value)}
                  onFocus={onSearchInputFocus}
                  placeholder="앱, 플로 검색"
                  data-visual-search="flows"
                  className="min-h-[44px] w-full rounded-xl border border-dark-150 bg-white px-3.5 py-2.5 text-sm text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
                />
                <ProductSearchSuggest
                  inputId="flow-search"
                  inputRef={searchInputRef}
                  inputValue={searchInput}
                  suggestions={suggestions}
                  isSearching={isSearchingSuggestions}
                  onSelect={onSuggestionSelect}
                  onClose={onSuggestClose}
                />
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <label htmlFor="flow-platform" className="sr-only">
                  플랫폼
                </label>
                <select
                  id="flow-platform"
                  value={platform ?? ''}
                  onChange={event => onPlatformChange(event.currentTarget.value)}
                  className="min-h-[44px] min-w-0 max-w-full cursor-pointer rounded-lg border border-dark-150 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
                >
                  <option value="">전체 플랫폼</option>
                  {VISUAL_PLATFORM_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label htmlFor="flow-type" className="sr-only">
                  플로 유형
                </label>
                <select
                  id="flow-type"
                  value={flowType ?? ''}
                  onChange={event => onFlowTypeChange(event.currentTarget.value)}
                  className="min-h-[44px] min-w-0 max-w-full cursor-pointer rounded-lg border border-dark-150 bg-white px-3 py-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
                >
                  <option value="">전체 유형</option>
                  {VISUAL_FLOW_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="md"
                  className="min-h-[44px] shrink-0 active:scale-[0.98] motion-reduce:transform-none"
                >
                  <span className="whitespace-nowrap">검색</span>
                </Button>
                {product !== null && (
                  <Button
                    type="button"
                    variant="shadow"
                    color="primary"
                    size="sm"
                    onClick={() => onProductClear()}
                    className="min-h-[44px] shrink-0 active:scale-[0.98] motion-reduce:transform-none"
                  >
                    <span className="max-w-48 truncate">{product}</span>
                    <span aria-hidden="true" className="ml-1 font-bold">
                      ×
                    </span>
                    <span className="sr-only">서비스 필터 해제</span>
                  </Button>
                )}
                {hasFilters && (
                  <button
                    type="button"
                    onClick={props.onClearFilters}
                    className="min-h-11 px-2 text-xs text-dark-600 underline underline-offset-4"
                  >
                    초기화
                  </button>
                )}
              </div>
            </form>
          }
          skeleton={<FlowCardSkeletons />}
          grid={<FlowCardGrid cards={cards} />}
          resourceName="플로"
          unitName="개의 플로"
        />
      </div>
    </div>
  );
};

export const FlowExplorer = bind<{}, FlowExplorerState>(() => useFlowExplorer(), View, {
  displayName: 'FlowExplorer',
});
