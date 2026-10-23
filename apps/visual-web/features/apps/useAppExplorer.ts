'use client';

import { useNavigate, useSearchParams } from '@darun/utils-router';
import { useEffect, useState } from 'react';
import {
  isOverlongExplorerQuery,
  readExplorerProductParam,
  readExplorerQueryParam,
} from '../explorer/useExplorerQuery';
import type { ProductSuggestion } from '../product-search/useProductSearchSuggest';
import { useProductSearchSuggest } from '../product-search/useProductSearchSuggest';
import { useScreenshotCatalog } from '../screenshots/useScreenshotCatalog';
import type { ScreenshotCard } from '../screenshots/useScreenshotExplorer';

export type AppCard = {
  id: string;
  name: string;
  slug: string;
  screenshots: ScreenshotCard[];
  screenshotCount: number;
  logoUrl: string;
};

export type AppExplorerState = {
  loading: boolean;
  networkError: boolean;
  queryLengthError: boolean;
  cards: AppCard[];
  searchInput: string;
  query: string | null;
  totalCount: number;
  hasFilters: boolean;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent) => void;
  onClearFilters: () => void;
  retry: () => void;
  searched: AppCard[] | null;
  isSearchingApps: boolean;
  suggestions: ProductSuggestion[];
  isSearchingSuggestions: boolean;
  onSuggestionSelect: (product: ProductSuggestion) => void;
  onSuggestClose: () => void;
  onSearchInputFocus: () => void;
  pagination: { firstHref: string; nextHref: string | null; isFirstPage: boolean };
};

export function useAppExplorer(): AppExplorerState {
  const searchParams = useSearchParams();
  const navigate = useNavigate();

  const query = readExplorerQueryParam(searchParams);
  const product = readExplorerProductParam(searchParams);
  const catalog = useScreenshotCatalog(query, product);
  const { loading, networkError, retry } = catalog;
  const [searchInput, setSearchInput] = useState(query ?? '');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 검색 파라미터 동기화에 필요
    setSearchInput(query ?? '');
  }, [query]);

  const queryLengthError = isOverlongExplorerQuery(query);

  const { suggestions, isSearching, clearSuggestions, suggest } = useProductSearchSuggest();

  const apps: AppCard[] = catalog.apps.map(app => ({
    id: app.id,
    name: app.name,
    slug: app.slug,
    logoUrl: app.logoUrl ?? '',
    screenshots: catalog.cards.filter(card => card.product.id === app.id).slice(0, 3),
    screenshotCount: app.screenshotCount,
  }));

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    suggest(value);
  };

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    clearSuggestions();
    const params = new URLSearchParams();
    const trimmed = searchInput.trim();
    if (trimmed.length > 0) {
      params.set('q', trimmed);
    }
    if (product !== null) {
      params.set('product', product);
    }
    const queryString = params.toString();
    navigate(queryString.length > 0 ? `/apps?${queryString}` : '/apps');
  };

  const onSuggestionSelect = (selected: ProductSuggestion) => {
    clearSuggestions();
    setSearchInput('');
    const trimmed = selected.name.trim();
    navigate(trimmed.length > 0 ? `/apps?q=${encodeURIComponent(trimmed)}` : '/apps');
  };

  const onSearchInputFocus = () => {
    if (searchInput.trim().length > 0) {
      suggest(searchInput);
    }
  };

  const searched = query === null ? null : apps;
  const visibleCards = apps;
  const firstParams = new URLSearchParams(searchParams);
  firstParams.delete('after');
  const nextParams = new URLSearchParams(firstParams);
  if (catalog.endCursor) nextParams.set('after', catalog.endCursor);
  const hasFilters = query !== null || product !== null;

  return {
    loading,
    networkError,
    queryLengthError,
    cards: visibleCards,
    searchInput,
    query,
    totalCount: catalog.totalCount,
    hasFilters,
    onSearchInputChange: handleSearchInputChange,
    onSearchSubmit,
    onClearFilters: () => {
      setSearchInput('');
      clearSuggestions();
      navigate('/apps');
    },
    retry,
    searched,
    isSearchingApps: false,
    suggestions,
    isSearchingSuggestions: isSearching,
    onSuggestionSelect,
    onSuggestClose: clearSuggestions,
    onSearchInputFocus,
    pagination: {
      firstHref: `/apps${firstParams.size ? `?${firstParams}` : ''}`,
      nextHref: catalog.hasNextPage && catalog.endCursor ? `/apps?${nextParams}` : null,
      isFirstPage: catalog.isFirstPage,
    },
  };
}
