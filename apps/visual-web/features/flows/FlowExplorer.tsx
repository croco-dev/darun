'use client';

import { Button, Layers } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useRef } from 'react';
import { SaveButton } from '../collections/SaveButton';
import { ExplorerShell } from '../explorer/ExplorerShell';
import { ProductSearchSuggest } from '../product-search/ProductSearchSuggest';
import { VISUAL_CARD_IMAGE_LOADING } from '../perf/imageLoading';
import {
  VISUAL_PLATFORM_LABELS,
  VISUAL_PLATFORM_OPTIONS,
  VISUAL_FLOW_TYPE_LABELS,
  VISUAL_FLOW_TYPE_OPTIONS,
} from './flowClassifications';
import { FlowExplorerState, FlowCard, useFlowExplorer } from './useFlowExplorer';

function FlowCardGrid({ cards }: { cards: FlowCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map(card => (
        <li
          key={card.id}
          className="min-w-0 overflow-hidden rounded-xl border border-dark-150 bg-white transition hover:border-dark-300"
        >
          <Link
            href={`/flows/${encodeURIComponent(card.id)}`}
            className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-inset"
          >
            <div className="flex min-h-28 w-full items-center justify-center overflow-hidden bg-surface-100">
              <img
                src={card.coverImageUrl}
                alt={card.coverImageAlt || (card.title ? `${card.title} 플로 커버 이미지` : '플로 커버 이미지')}
                loading={VISUAL_CARD_IMAGE_LOADING}
                className="h-auto max-h-64 w-full object-contain object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
              />
            </div>
            <div className="flex flex-col gap-1 p-3">
              <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-dark-900">
                <Layers size={14} className="shrink-0 text-dark-400" aria-hidden="true" />
                {card.title}
              </span>
              <span className="flex items-center gap-2 text-xs text-dark-600">
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
          <div className="flex items-center justify-end border-t border-dark-100 px-2 py-1">
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
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
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

const View = (props: FlowExplorerState & { hideHero?: boolean }) => {
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
    onClearFilters,
    suggestions,
    isSearchingSuggestions,
    onSuggestionSelect,
    onSuggestClose,
    onSearchInputFocus,
    hideHero,
  } = props;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasFilters = searchInput.trim().length > 0 || platform !== null || flowType !== null || product !== null;

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 md:gap-10 md:px-6">
        <ExplorerShell
          state={{ ...props, hasFilters }}
          hero={
            hideHero !== true ? (
              <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-dark-900 break-words [word-break:keep-all] md:text-3xl">
                  UX 플로 탐색
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-dark-500 break-words [word-break:keep-all]">
                  서비스의 핵심 흐름을 단계별 화면으로 따라가 보세요.
                </p>
              </header>
            ) : (
              <h1 className="sr-only">플로 탐색</h1>
            )
          }
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
                  placeholder="플로 제목, 설명, 서비스명으로 검색"
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
                  className="min-h-[44px] cursor-pointer rounded-xl border border-dark-150 bg-white px-3 py-2.5 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
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
                  className="min-h-[44px] cursor-pointer rounded-xl border border-dark-150 bg-white px-3 py-2.5 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
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
                    variant="shadow"
                    color="primary"
                    size="sm"
                    onClick={() => onClearFilters()}
                    className="min-h-[44px] shrink-0 active:scale-[0.98] motion-reduce:transform-none"
                  >
                    <span className="max-w-48 truncate">{product}</span>
                    <span aria-hidden="true" className="ml-1 font-bold">
                      ×
                    </span>
                    <span className="sr-only">서비스 필터 해제</span>
                  </Button>
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

const BoundFlowExplorer = bind<{ hideHero?: boolean }, FlowExplorerState & { hideHero?: boolean }>(
  props => ({ ...useFlowExplorer(), hideHero: props.hideHero }),
  View,
  {
    displayName: 'FlowExplorer',
  }
);

export function FlowExplorer({ hideHero }: { hideHero?: boolean }) {
  return <BoundFlowExplorer hideHero={hideHero} />;
}
