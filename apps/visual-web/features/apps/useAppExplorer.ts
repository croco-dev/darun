'use client';

import { useApolloClient } from '@apollo/client/react';
import { RecentProductsOnVisualAppsDocument } from '@darun/provider-graphql';
import type { RecentProductsOnVisualAppsQuery } from '@darun/provider-graphql';
import { useNavigate, useSearchParams } from '@darun/utils-router';
import { useEffect, useState } from 'react';
import {
  isOverlongExplorerQuery,
  readExplorerProductParam,
  readExplorerQueryParam,
} from '../explorer/useExplorerQuery';
import type { ProductSuggestion } from '../product-search/useProductSearchSuggest';
import { useProductSearchSuggest } from '../product-search/useProductSearchSuggest';
import { VISUAL_APPS_PAGE_SIZE } from './documents';

export type AppCard = {
  id: string;
  name: string;
  slug: string;
  summary: string;
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
};

type RecentProductNode = RecentProductsOnVisualAppsQuery['recentProducts'][number];

function mapNodeToCard(node: RecentProductNode): AppCard | null {
  if (!node?.id || !node.name || !node.slug) {
    return null;
  }
  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    summary: node.summary ?? '',
    logoUrl: node.logoUrl ?? '',
  };
}

export function useAppExplorer(): AppExplorerState {
  const apolloClient = useApolloClient();
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const { suggestions, isSearching, clearSuggestions, suggest } = useProductSearchSuggest();

  const query = readExplorerQueryParam(searchParams);
  const product = readExplorerProductParam(searchParams);
  const [searchInput, setSearchInput] = useState(query ?? '');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 검색 파라미터 동기화에 필요
    setSearchInput(query ?? '');
  }, [query]);

  const queryLengthError = isOverlongExplorerQuery(query);

  const [cards, setCards] = useState<AppCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 재시도 시 로딩 상태 리셋에 필요
    setLoading(true);

    setNetworkError(false);
    apolloClient
      .query({ query: RecentProductsOnVisualAppsDocument, variables: { first: VISUAL_APPS_PAGE_SIZE } })
      .then(result => {
        if (!active) {
          return;
        }
        setCards(
          (result.data?.recentProducts ?? []).flatMap(node => {
            const card = mapNodeToCard(node);
            return card ? [card] : [];
          })
        );
        setLoading(false);
      })
      .catch((e: unknown) => {
        console.error('Failed to load recent products', e);
        if (active) {
          setNetworkError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [apolloClient, requestKey]);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    suggest(value);
  };

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    clearSuggestions();
    const trimmed = searchInput.trim();
    navigate(trimmed.length > 0 ? `/apps?q=${encodeURIComponent(trimmed)}` : '/apps');
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

  const searched: AppCard[] | null =
    query === null || queryLengthError
      ? null
      : suggestions.map(s => ({ id: s.id, name: s.name, slug: s.slug, summary: '', logoUrl: s.logoUrl }));

  const visibleCards = searched ?? cards;
  const hasFilters = query !== null || product !== null;

  return {
    loading: query === null ? loading : false,
    networkError: query === null ? networkError : false,
    queryLengthError,
    cards: visibleCards,
    searchInput,
    query,
    totalCount: visibleCards.length,
    hasFilters,
    onSearchInputChange: handleSearchInputChange,
    onSearchSubmit,
    onClearFilters: () => {
      setSearchInput('');
      clearSuggestions();
      navigate('/apps');
    },
    retry: () => setRequestKey(key => key + 1),
    searched,
    isSearchingApps: isSearching,
    suggestions,
    isSearchingSuggestions: isSearching,
    onSuggestionSelect,
    onSuggestClose: clearSuggestions,
    onSearchInputFocus,
  };
}
