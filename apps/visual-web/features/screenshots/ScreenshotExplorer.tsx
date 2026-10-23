'use client';

import { Button } from '@darun/ui';
import { Link, useNavigate, useSearchParams } from '@darun/utils-router';
import { useEffect, useRef, useState } from 'react';
import { CatalogPagination } from '../apps/CatalogPagination';
import { SaveButton } from '../collections/SaveButton';
import { ExplorerShell } from '../explorer/ExplorerShell';
import type { ExplorerSearchDraft } from '../explorer/useExplorerQuery';
import {
  buildExplorerUrl,
  readExplorerProductParam,
  readExplorerQueryParam,
  type ExplorerFilters,
} from '../explorer/useExplorerQuery';
import { ProductSearchSuggest } from '../product-search/ProductSearchSuggest';
import { useProductSearchSuggest, type ProductSuggestion } from '../product-search/useProductSearchSuggest';
import { ScreenshotImage } from './ScreenshotImage';
import { groupScreenshotCatalog, useScreenshotCatalog } from './useScreenshotCatalog';
import { type ScreenshotExplorerState, type ScreenshotCard, useScreenshotExplorer } from './useScreenshotExplorer';
import {
  VISUAL_PLATFORM_OPTIONS,
  VISUAL_SCREEN_TYPE_OPTIONS,
  VISUAL_UI_ELEMENT_OPTIONS,
  isVisualPlatformValue,
  isVisualScreenTypeValue,
  isVisualUiElementValue,
} from './visualClassifications';

function ScreenshotPreview({ card, showIdentity = false }: { card: ScreenshotCard; showIdentity?: boolean }) {
  const title = card.title || card.imageAlt || `${card.product.name} 스크린샷`;
  return (
    <div className="min-w-0">
      <div className="min-w-0">
        <Link
          href={`/screenshots/${encodeURIComponent(card.id)}`}
          aria-label={`${title} 화면 보기`}
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900"
        >
          <ScreenshotImage src={card.imageUrl} alt={card.imageAlt || title} />
        </Link>
        <div className="flex justify-end pt-1">
          <SaveButton
            item={{
              kind: 'screenshot',
              id: card.id,
              title,
              imageUrl: card.imageUrl,
              href: `/screenshots/${encodeURIComponent(card.id)}`,
              productName: card.product.name,
            }}
          />
        </div>
      </div>
      {showIdentity && (
        <div className="min-w-0 pt-2">
          <Link
            href={`/apps/${encodeURIComponent(card.product.slug)}`}
            className="block truncate text-xs text-dark-600 hover:text-dark-900"
          >
            {card.product.name}
          </Link>
          <Link
            href={`/screenshots/${encodeURIComponent(card.id)}`}
            className="mt-0.5 block truncate text-sm font-medium text-dark-900"
          >
            {title}
          </Link>
        </div>
      )}
    </div>
  );
}

function View(props: ScreenshotExplorerState & { catalogMode?: boolean }) {
  const { cards, searchInput, platform, screenType, element, product, catalogMode } = props;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const groups = catalogMode ? groupScreenshotCatalog(cards) : [];
  const hasFilters = !!(searchInput.trim() || platform || screenType || element || product);
  return (
    <ExplorerShell
      hero={<h1 className="sr-only">화면 탐색</h1>}
      state={{
        ...props,
        totalCount: props.totalCount,
        hasNextPage: props.pagination ? false : props.hasNextPage,
        hasFilters,
      }}
      searchForm={
        <form onSubmit={props.onSearchSubmit} role="search" className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-0 basis-full md:basis-56 md:flex-1">
            <label htmlFor="screenshot-search" className="sr-only">
              스크린샷 검색
            </label>
            <input
              ref={searchInputRef}
              id="screenshot-search"
              type="search"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={
                props.suggestions.length > 0 || (searchInput.trim().length > 0 && props.isSearchingSuggestions)
              }
              aria-controls="screenshot-search-suggest-listbox"
              value={searchInput}
              onChange={event => props.onSearchInputChange(event.currentTarget.value)}
              onFocus={props.onSearchInputFocus}
              placeholder="앱, 화면 검색"
              data-visual-search="screenshots"
              className="min-h-11 w-full rounded-lg border border-dark-150 bg-white px-3 text-sm text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-dark-900/60"
            />
            <ProductSearchSuggest
              inputId="screenshot-search"
              inputRef={searchInputRef}
              inputValue={searchInput}
              suggestions={props.suggestions}
              isSearching={props.isSearchingSuggestions}
              onSelect={props.onSuggestionSelect}
              onClose={props.onSuggestClose}
            />
          </div>
          {[
            {
              id: 'platform',
              label: '플랫폼',
              value: platform,
              options: VISUAL_PLATFORM_OPTIONS,
              change: props.onPlatformChange,
            },
            {
              id: 'screen-type',
              label: '화면 유형',
              value: screenType,
              options: VISUAL_SCREEN_TYPE_OPTIONS,
              change: props.onScreenTypeChange,
            },
            {
              id: 'element',
              label: 'UI 요소',
              value: element,
              options: VISUAL_UI_ELEMENT_OPTIONS,
              change: props.onElementChange,
            },
          ].map(filter => (
            <select
              key={filter.id}
              id={`screenshot-${filter.id}`}
              aria-label={filter.label}
              value={filter.value ?? ''}
              onChange={event => filter.change(event.currentTarget.value)}
              className="min-h-11 min-w-0 max-w-full flex-1 cursor-pointer rounded-lg border border-dark-150 bg-white px-2 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-dark-900/60 sm:flex-none"
            >
              <option value="">{filter.label}</option>
              {filter.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
          <Button type="submit" variant="contained" color="primary" size="md" className="min-h-11 shrink-0">
            검색
          </Button>
          {product && (
            <button
              type="button"
              onClick={props.onProductClear}
              className="min-h-11 max-w-full truncate rounded-lg bg-surface-100 px-3 text-sm text-dark-700"
              aria-label={`${product} 서비스 필터 해제`}
            >
              {product} ×
            </button>
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
        </form>
      }
      skeleton={
        <div aria-hidden="true" className="grid grid-cols-1 gap-10 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-96 animate-pulse rounded-lg bg-surface-100 motion-reduce:animate-none" />
          ))}
        </div>
      }
      grid={
        catalogMode ? (
          <ul className="grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-2">
            {groups.map(({ product: app, screenshots }) => (
              <li key={app.id} className="min-w-0">
                <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
                  <Link
                    href={`/apps/${encodeURIComponent(app.slug)}`}
                    className="flex min-w-0 items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900"
                  >
                    <img
                      src={app.logoUrl || '/images/default-product-icon.svg'}
                      alt=""
                      width={32}
                      height={32}
                      loading="lazy"
                      className="h-8 w-8 shrink-0 rounded-lg object-contain"
                    />
                    <span className="truncate text-sm font-semibold text-dark-900">{app.name}</span>
                  </Link>
                  <Link
                    href={`/apps/${encodeURIComponent(app.slug)}`}
                    className="shrink-0 text-xs text-dark-500 hover:text-dark-900"
                    aria-label={`${app.name} 화면 ${app.screenshotCount ?? screenshots.length}개 모두 보기`}
                  >
                    {app.screenshotCount ?? screenshots.length}개 화면 ↗
                  </Link>
                </div>
                <div className="grid grid-cols-3 items-start gap-2 sm:gap-3">
                  {screenshots.slice(0, 3).map(card => (
                    <ScreenshotPreview key={card.id} card={card} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-2 items-start gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {cards.map(card => (
              <li key={card.id} className="min-w-0">
                <ScreenshotPreview card={card} showIdentity />
              </li>
            ))}
          </ul>
        )
      }
      children={props.pagination ? <CatalogPagination {...props.pagination} /> : undefined}
      resourceName={catalogMode ? '앱' : '스크린샷'}
      unitName={catalogMode ? '개의 앱' : '개의 화면'}
    />
  );
}

const EMPTY_FILTERS: ExplorerFilters = {
  query: null,
  platform: null,
  secondary: null,
  product: null,
};

function CatalogExplorer({ searchDraft }: { searchDraft: ExplorerSearchDraft }) {
  const navigate = useNavigate();
  const catalog = useScreenshotCatalog();
  const { cards, loading, networkError, retry } = catalog;
  const params = new URLSearchParams();
  if (catalog.endCursor) params.set('after', catalog.endCursor);
  const { suggestions, isSearching, clearSuggestions, suggest } = useProductSearchSuggest();
  const { searchInput, setSearchInput } = searchDraft;
  const navigateFilter = (next: Parameters<typeof buildExplorerUrl>[3]) =>
    navigate(
      buildExplorerUrl('/', EMPTY_FILTERS, 'screenType', {
        ...next,
      })
    );
  const clear = () => {
    setSearchInput('');
    clearSuggestions();
    navigate('/');
  };
  const onSuggestionSelect = (selected: ProductSuggestion) => {
    clearSuggestions();
    setSearchInput('');
    navigateFilter({ q: null, product: selected.slug });
  };
  return (
    <View
      catalogMode
      cards={cards}
      loading={loading}
      networkError={networkError}
      retry={retry}
      error={undefined}
      queryLengthError={false}
      totalCount={catalog.totalCount}
      pagination={{
        firstHref: '/',
        nextHref: catalog.hasNextPage && catalog.endCursor ? `/?${params}` : null,
        isFirstPage: catalog.isFirstPage,
      }}
      hasNextPage={false}
      loadingMore={false}
      loadMoreError={false}
      searchInput={searchInput}
      platform={null}
      secondary={null}
      product={null}
      query={null}
      screenType={null}
      element={null}
      onSearchInputChange={value => {
        setSearchInput(value);
        suggest(value);
      }}
      onSearchSubmit={event => {
        event.preventDefault();
        clearSuggestions();
        navigateFilter({ q: searchInput.trim() || null });
      }}
      onPlatformChange={value => navigateFilter({ platform: value || null })}
      onSecondaryChange={value => navigateFilter({ secondary: value || null })}
      onScreenTypeChange={value => navigateFilter({ secondary: value || null })}
      onElementChange={value => navigateFilter({ element: value || null })}
      onClearFilters={clear}
      onProductClear={clear}
      onLoadMore={retry}
      suggestions={suggestions}
      isSearchingSuggestions={isSearching}
      onSuggestionSelect={onSuggestionSelect}
      onSuggestClose={clearSuggestions}
      onSearchInputFocus={() => {
        if (searchInput.trim()) suggest(searchInput);
      }}
    />
  );
}

function FilteredExplorer({ searchDraft }: { searchDraft: ExplorerSearchDraft }) {
  return <View {...useScreenshotExplorer(searchDraft)} />;
}

export function ScreenshotExplorer() {
  const searchParams = useSearchParams();
  const query = readExplorerQueryParam(searchParams);
  const [searchInput, setSearchInput] = useState(query ?? '');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Only submitted URL queries replace a draft.
    setSearchInput(query ?? '');
  }, [query]);
  const searchDraft = { searchInput, setSearchInput };
  const filtered =
    readExplorerQueryParam(searchParams) !== null ||
    readExplorerProductParam(searchParams) !== null ||
    isVisualPlatformValue(searchParams.get('platform')) ||
    isVisualScreenTypeValue(searchParams.get('screenType')) ||
    isVisualUiElementValue(searchParams.get('element'));
  return filtered ? <FilteredExplorer searchDraft={searchDraft} /> : <CatalogExplorer searchDraft={searchDraft} />;
}
