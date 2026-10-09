'use client';

import { Button } from '@darun/ui';
import { Link, useNavigate, useSearchParams } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useRef, useState } from 'react';
import { SaveButton } from '../collections/SaveButton';
import { ExplorerShell } from '../explorer/ExplorerShell';
import {
  buildExplorerUrl,
  readExplorerProductParam,
  readExplorerQueryParam,
  type ExplorerFilters,
} from '../explorer/useExplorerQuery';
import { ProductSearchSuggest } from '../product-search/ProductSearchSuggest';
import { useProductSearchSuggest, type ProductSuggestion } from '../product-search/useProductSearchSuggest';
import { ScreenshotImage } from './ScreenshotImage';
import { useScreenshotCatalog } from './useScreenshotCatalog';
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

type ScreenshotViewMode = 'grid' | 'list';

function cardTitle(card: ScreenshotCard): string {
  return card.title ?? card.imageAlt ?? '스크린샷';
}

const DEFAULT_PRODUCT_ICON = '/images/default-product-icon.svg';

function toSaveItem(card: ScreenshotCard) {
  return {
    kind: 'screenshot' as const,
    id: card.id,
    title: cardTitle(card),
    imageUrl: card.imageUrl,
    href: `/screenshots/${encodeURIComponent(card.id)}`,
    productName: card.product.name,
  };
}

function ScreenshotMeta({ card }: { card: ScreenshotCard }) {
  const platformLabel =
    card.platform && isVisualPlatformValue(card.platform) ? VISUAL_PLATFORM_LABELS[card.platform] : UNCLASSIFIED_LABEL;
  const typeLabel =
    card.screenType && isVisualScreenTypeValue(card.screenType)
      ? VISUAL_SCREEN_TYPE_LABELS[card.screenType]
      : UNCLASSIFIED_LABEL;
  return (
    <div className="flex flex-col gap-1 p-3">
      <span className="flex min-w-0 items-center gap-1.5">
        {card.product.logoUrl ? (
          <img
            src={card.product.logoUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 rounded object-contain"
          />
        ) : null}
        <span className="truncate text-xs font-semibold text-dark-700">{card.product.name}</span>
      </span>
      <span className="truncate text-sm font-bold text-dark-900">{cardTitle(card)}</span>
      <span className="text-xs text-dark-500">
        {platformLabel} · {typeLabel}
      </span>
    </div>
  );
}

// Home catalog identity: real app logo + name as the primary link above the
// representative shot. Sibling of the screenshot link, never nested in it.
function AppIdentityLink({ card }: { card: ScreenshotCard }) {
  return (
    <Link
      href={`/apps/${encodeURIComponent(card.product.slug)}`}
      aria-label={`${card.product.name} 앱으로 이동`}
      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
    >
      <img
        src={card.product.logoUrl || DEFAULT_PRODUCT_ICON}
        alt={`${card.product.name} 로고`}
        loading="lazy"
        width={40}
        height={40}
        className="h-9 w-9 shrink-0 rounded-lg border border-dark-150 bg-surface-100 object-cover md:h-10 md:w-10"
      />
      <span className="min-w-0 flex-1 line-clamp-2 text-base font-bold leading-snug text-dark-900 [overflow-wrap:anywhere]">
        {card.product.name}
      </span>
    </Link>
  );
}

function ScreenshotCardGrid({ cards, catalogMode }: { cards: ScreenshotCard[]; catalogMode?: boolean }) {
  if (catalogMode === true) {
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {cards.map(card => (
          <li key={card.id} className="relative min-w-0">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card">
              <div className="flex min-w-0 items-center p-3 pb-2">
                <AppIdentityLink card={card} />
              </div>
              <div className="relative">
                <Link
                  href={`/screenshots/${encodeURIComponent(card.id)}`}
                  aria-label={`${cardTitle(card)} 화면으로 이동`}
                  className="block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-inset"
                >
                  <ScreenshotImage
                    src={card.imageUrl}
                    alt={
                      card.imageAlt ||
                      card.title ||
                      (card.product.name ? `${card.product.name} 스크린샷` : '스크린샷 이미지')
                    }
                    platform={card.platform}
                    variant="card"
                  />
                  <span className="block line-clamp-2 px-3 py-2 text-xs text-dark-500">{cardTitle(card)}</span>
                </Link>
                <SaveButton item={toSaveItem(card)} className="absolute top-2 right-2" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {cards.map(card => (
        <li key={card.id} className="relative">
          <Link
            href={`/screenshots/${encodeURIComponent(card.id)}`}
            className="group block overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <ScreenshotImage
              src={card.imageUrl}
              alt={
                card.imageAlt || card.title || (card.product.name ? `${card.product.name} 스크린샷` : '스크린샷 이미지')
              }
              platform={card.platform}
              variant="card"
            />
            <ScreenshotMeta card={card} />
          </Link>
          <SaveButton item={toSaveItem(card)} className="absolute top-2 right-2" />
        </li>
      ))}
    </ul>
  );
}

function ScreenshotCardList({ cards, catalogMode }: { cards: ScreenshotCard[]; catalogMode?: boolean }) {
  if (catalogMode === true) {
    return (
      <ul className="flex flex-col gap-2">
        {cards.map(card => (
          <li
            key={card.id}
            className="relative min-w-0 overflow-hidden rounded-2xl border border-dark-150 bg-white p-2 shadow-2xs"
          >
            <div className="flex min-w-0 items-center gap-2 px-1 pt-1 pb-2">
              <AppIdentityLink card={card} />
              <SaveButton item={toSaveItem(card)} className="shrink-0" />
            </div>
            <Link
              href={`/screenshots/${encodeURIComponent(card.id)}`}
              aria-label={`${cardTitle(card)} 화면으로 이동`}
              className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              <ScreenshotImage
                src={card.imageUrl}
                alt={
                  card.imageAlt ||
                  card.title ||
                  (card.product.name ? `${card.product.name} 스크린샷` : '스크린샷 이미지')
                }
                platform={card.platform}
                variant="thumb"
              />
              <span className="min-w-0 flex-1 py-1 text-xs leading-relaxed text-dark-500 line-clamp-2 [overflow-wrap:anywhere]">
                {cardTitle(card)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {cards.map(card => (
        <li
          key={card.id}
          className="relative flex gap-3 overflow-hidden rounded-2xl border border-dark-150 bg-white p-2 shadow-2xs"
        >
          <Link
            href={`/screenshots/${encodeURIComponent(card.id)}`}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            <ScreenshotImage
              src={card.imageUrl}
              alt={
                card.imageAlt || card.title || (card.product.name ? `${card.product.name} 스크린샷` : '스크린샷 이미지')
              }
              platform={card.platform}
              variant="thumb"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 py-1">
              <span className="flex min-w-0 items-center gap-1.5">
                {card.product.logoUrl ? (
                  <img
                    src={card.product.logoUrl}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    width={16}
                    height={16}
                    className="h-4 w-4 shrink-0 rounded object-contain"
                  />
                ) : null}
                <span className="truncate text-xs font-semibold text-dark-700">{card.product.name}</span>
              </span>
              <span className="truncate text-sm font-bold text-dark-900">{cardTitle(card)}</span>
              <span className="text-xs text-dark-500">
                {(card.platform && isVisualPlatformValue(card.platform)
                  ? VISUAL_PLATFORM_LABELS[card.platform]
                  : UNCLASSIFIED_LABEL) +
                  ' · ' +
                  (card.screenType && isVisualScreenTypeValue(card.screenType)
                    ? VISUAL_SCREEN_TYPE_LABELS[card.screenType]
                    : UNCLASSIFIED_LABEL)}
              </span>
            </span>
          </Link>
          <SaveButton item={toSaveItem(card)} className="shrink-0 self-start" />
        </li>
      ))}
    </ul>
  );
}

function ScreenshotCardSkeletons() {
  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      aria-hidden="true"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-2xl border border-dark-150 bg-white">
          <div className="min-h-40 w-full animate-pulse bg-surface-200 motion-reduce:animate-none" />
          <div className="flex flex-col gap-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ScreenshotViewSwitch({
  mode,
  onChange,
}: {
  mode: ScreenshotViewMode;
  onChange: (mode: ScreenshotViewMode) => void;
}) {
  return (
    <div role="group" aria-label="보기 방식" className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-pressed={mode === 'grid'}
        aria-label="격자 보기"
        onClick={() => onChange('grid')}
        className="min-h-[36px] min-w-[36px] rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 data-[active=true]:border-dark-900 data-[active=true]:bg-dark-900 data-[active=true]:text-white border-dark-150 bg-white text-dark-700"
        data-active={mode === 'grid'}
      >
        격자
      </button>
      <button
        type="button"
        aria-pressed={mode === 'list'}
        aria-label="목록 보기"
        onClick={() => onChange('list')}
        className="min-h-[36px] min-w-[36px] rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 data-[active=true]:border-dark-900 data-[active=true]:bg-dark-900 data-[active=true]:text-white border-dark-150 bg-white text-dark-700"
        data-active={mode === 'list'}
      >
        목록
      </button>
    </div>
  );
}

const View = (props: ScreenshotExplorerState & { hideHero?: boolean; catalogMode?: boolean }) => {
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
    catalogMode,
  } = props;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<ScreenshotViewMode>('grid');
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
        <form onSubmit={onSearchSubmit} role="search" className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-36 flex-1">
            <label htmlFor="screenshot-search" className="sr-only">
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
          <label htmlFor="screenshot-platform" className="sr-only">
            플랫폼
          </label>
          <select
            id="screenshot-platform"
            aria-label="플랫폼"
            value={platform ?? ''}
            onChange={event => onPlatformChange(event.currentTarget.value)}
            className="min-h-[44px] cursor-pointer rounded-xl border border-dark-150 bg-white px-3 py-2.5 text-sm text-dark-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-dark-900/60"
          >
            <option value="">전체 플랫폼</option>
            {VISUAL_PLATFORM_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label htmlFor="screenshot-screen-type" className="sr-only">
            화면 유형
          </label>
          <select
            id="screenshot-screen-type"
            aria-label="화면 유형"
            value={screenType ?? ''}
            onChange={event => onScreenTypeChange(event.currentTarget.value)}
            className="min-h-[44px] cursor-pointer rounded-xl border border-dark-150 bg-white px-3 py-2.5 text-sm text-dark-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-dark-900/60"
          >
            <option value="">전체 유형</option>
            {VISUAL_SCREEN_TYPE_OPTIONS.map(option => (
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
            className="shrink-0 active:scale-[0.98] motion-reduce:transform-none"
          >
            <span className="whitespace-nowrap">검색</span>
          </Button>
          {product !== null && (
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
          )}
        </form>
      }
      skeleton={<ScreenshotCardSkeletons />}
      grid={
        viewMode === 'grid' ? (
          <ScreenshotCardGrid cards={cards} catalogMode={catalogMode} />
        ) : (
          <ScreenshotCardList cards={cards} catalogMode={catalogMode} />
        )
      }
      resourceName={catalogMode === true ? '앱' : '스크린샷'}
      unitName={catalogMode === true ? '개의 앱 · 앱당 최신 1장' : '개의 화면'}
      resultsControls={<ScreenshotViewSwitch mode={viewMode} onChange={setViewMode} />}
    />
  );
};

const EMPTY_CATALOG_FILTERS: ExplorerFilters = { query: null, platform: null, secondary: null, product: null };

const BoundFilteredExplorer = bind<{ hideHero?: boolean }, ScreenshotExplorerState & { hideHero?: boolean }>(
  props => ({ ...useScreenshotExplorer(), hideHero: props.hideHero }),
  View,
  {
    displayName: 'ScreenshotExplorer',
  }
);

function CatalogExplorer({ hideHero }: { hideHero?: boolean }) {
  const navigate = useNavigate();
  const { suggestions, isSearching: isSearchingSuggestions, clearSuggestions, suggest } = useProductSearchSuggest();
  const { cards, loading, networkError, retry } = useScreenshotCatalog(true);
  const [searchInput, setSearchInput] = useState('');
  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    suggest(value);
  };
  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    clearSuggestions();
    navigate(
      buildExplorerUrl('/', EMPTY_CATALOG_FILTERS, 'screenType', {
        q: searchInput.trim().length > 0 ? searchInput : null,
      })
    );
  };
  const handleSuggestionSelect = (selected: ProductSuggestion) => {
    clearSuggestions();
    setSearchInput('');
    navigate(buildExplorerUrl('/', EMPTY_CATALOG_FILTERS, 'screenType', { q: null, product: selected.slug }));
  };
  const viewState: ScreenshotExplorerState & { hideHero?: boolean; catalogMode?: boolean } = {
    loading,
    error: undefined,
    queryLengthError: false,
    networkError,
    cards,
    totalCount: cards.length,
    hasNextPage: false,
    loadingMore: false,
    loadMoreError: false,
    searchInput,
    platform: null,
    secondary: null,
    product: null,
    query: null,
    screenType: null,
    onSearchInputChange: handleSearchInputChange,
    onSearchSubmit: handleSearchSubmit,
    onPlatformChange: (value: string) =>
      navigate(
        buildExplorerUrl('/', EMPTY_CATALOG_FILTERS, 'screenType', { platform: value.length > 0 ? value : null })
      ),
    onSecondaryChange: (value: string) =>
      navigate(
        buildExplorerUrl('/', EMPTY_CATALOG_FILTERS, 'screenType', { secondary: value.length > 0 ? value : null })
      ),
    onScreenTypeChange: (value: string) =>
      navigate(
        buildExplorerUrl('/', EMPTY_CATALOG_FILTERS, 'screenType', { secondary: value.length > 0 ? value : null })
      ),
    onClearFilters: () => {
      setSearchInput('');
      clearSuggestions();
      navigate('/');
    },
    onLoadMore: () => {},
    retry,
    suggestions,
    isSearchingSuggestions,
    onSuggestionSelect: handleSuggestionSelect,
    onSuggestClose: clearSuggestions,
    onSearchInputFocus: () => {
      if (searchInput.trim().length > 0) {
        suggest(searchInput);
      }
    },
    hideHero,
    catalogMode: true,
  };
  return <View {...viewState} />;
}

export function ScreenshotExplorer({ hideHero }: { hideHero?: boolean }) {
  const searchParams = useSearchParams();
  const platformParam = searchParams.get('platform');
  const screenTypeParam = searchParams.get('screenType');
  const catalogMode =
    readExplorerQueryParam(searchParams) === null &&
    readExplorerProductParam(searchParams) === null &&
    (platformParam === null || !isVisualPlatformValue(platformParam)) &&
    (screenTypeParam === null || !isVisualScreenTypeValue(screenTypeParam));
  if (catalogMode) {
    return <CatalogExplorer hideHero={hideHero} />;
  }
  return <BoundFilteredExplorer hideHero={hideHero} />;
}
