'use client';

import type { DocumentNode, ObservableQuery } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate, useSearchParams } from '@darun/utils-router';
import { useEffect, useMemo, useState } from 'react';
import { useProductSearchSuggest } from '../product-search/useProductSearchSuggest';
import type { ProductSuggestion } from '../product-search/useProductSearchSuggest';

export const VISUAL_QUERY_MAX_LENGTH = 100;

export type ExplorerFilters = {
  query: string | null;
  platform: string | null;
  secondary: string | null;
  product: string | null;
};

export type ExplorerBaseState<TCard> = {
  loading: boolean;
  error: Error | undefined;
  queryLengthError: boolean;
  networkError: boolean;
  cards: TCard[];
  totalCount: number;
  hasNextPage: boolean;
  loadingMore: boolean;
  loadMoreError: boolean;
  searchInput: string;
  platform: string | null;
  secondary: string | null;
  product: string | null;
  query: string | null;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent) => void;
  onPlatformChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
  retry: () => void;
  suggestions: ProductSuggestion[];
  isSearchingSuggestions: boolean;
  onSuggestionSelect: (product: ProductSuggestion) => void;
  onSuggestClose: () => void;
  onSearchInputFocus: () => void;
};

type ExplorerQueryOptions<TNode, TCard> = {
  document: DocumentNode;
  connectionKey: string;
  pageSize: number;
  basePath: string;
  secondaryParamKey: string;
  clearFiltersTo: string | ((product: string | null) => string);
  readFilters: (searchParams: URLSearchParams) => ExplorerFilters;
  buildVariables: (filters: ExplorerFilters) => Record<string, unknown>;
  mapEdgeToCard: (node: TNode) => TCard | null;
  getEdges: (data: unknown) => Array<{ node?: TNode | null } | null> | undefined;
  getConnection: (
    data: unknown
  ) => { totalCount?: number; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } } | undefined;
  getNodeId: (node: TNode) => string | undefined;
  refetchLabel: string;
  loadMoreLabel: string;
};

type EdgeLike<TNode> = { node?: TNode | null } | null;

export function readExplorerQueryParam(searchParams: URLSearchParams) {
  const rawQuery = searchParams.get('q');
  return rawQuery !== null && rawQuery.trim().length > 0 ? rawQuery.trim() : null;
}

export function readExplorerProductParam(searchParams: URLSearchParams) {
  const rawProduct = searchParams.get('product');
  return rawProduct !== null && rawProduct.trim().length > 0 ? rawProduct.trim() : null;
}

export function buildExplorerUrl(
  basePath: string,
  filters: ExplorerFilters,
  secondaryParamKey: string,
  next: { q?: string | null; platform?: string | null; secondary?: string | null; product?: string | null }
) {
  const params = new URLSearchParams();
  const nextQuery = next.q !== undefined ? next.q : filters.query;
  const nextPlatform = next.platform !== undefined ? next.platform : filters.platform;
  const nextSecondary = next.secondary !== undefined ? next.secondary : filters.secondary;
  const nextProduct = next.product !== undefined ? next.product : filters.product;
  if (nextQuery !== null) {
    params.set('q', nextQuery);
  }
  if (nextPlatform !== null) {
    params.set('platform', nextPlatform);
  }
  if (nextSecondary !== null) {
    params.set(secondaryParamKey, nextSecondary);
  }
  if (nextProduct !== null) {
    params.set('product', nextProduct);
  }
  const queryString = params.toString();
  return queryString.length > 0 ? `${basePath}?${queryString}` : basePath;
}

function mergeEdges<TCard>(previousCards: TCard[], incomingCards: TCard[], getId: (card: TCard) => string) {
  const seen = new Set(previousCards.map(card => getId(card)));
  const merged = [...previousCards];
  for (const card of incomingCards) {
    const id = getId(card);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(card);
    }
  }
  return merged;
}

export { mergeEdges as mergeCardsForTest };

export function useExplorerQuery<TNode, TCard>(options: ExplorerQueryOptions<TNode, TCard>) {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const apolloClient = useApolloClient();

  const { suggestions, isSearching: isSearchingSuggestions, clearSuggestions, suggest } = useProductSearchSuggest();

  const filters = useMemo(() => options.readFilters(searchParams), [options, searchParams]);
  const { query, platform, secondary, product } = filters;

  const [searchInput, setSearchInput] = useState(query ?? '');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 검색 파라미터 동기화에 필요
    setSearchInput(query ?? '');
  }, [query]);

  const queryLengthError = query !== null && query.trim().length > VISUAL_QUERY_MAX_LENGTH;

  const observable = useMemo(
    () =>
      apolloClient.watchQuery({
        query: options.document,
        variables: {
          ...options.buildVariables({ query: queryLengthError ? null : query, platform, secondary, product }),
          first: options.pageSize,
          after: null,
        },
        notifyOnNetworkStatusChange: true,
      }),
    [apolloClient, options, query, platform, secondary, product, queryLengthError]
  );

  const [result, setResult] = useState(() => observable.getCurrentResult());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- observable 교체 시 결과 재동기화에 필요
    setResult(observable.getCurrentResult());
    const subscription = observable.subscribe(nextResult => {
      setResult({ ...nextResult });
    });
    return () => subscription.unsubscribe();
  }, [observable]);

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  const data = result.data as unknown;
  const rawEdges = (options.getEdges(data) ?? []) as EdgeLike<TNode>[];
  const cards = rawEdges.flatMap(edge => {
    const node = edge?.node;
    if (!node) {
      return [];
    }
    const card = options.mapEdgeToCard(node);
    return card ? [card] : [];
  });
  const connection = options.getConnection(data);
  const hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
  const endCursor = connection?.pageInfo?.endCursor ?? null;

  const queryError = result.error;
  const graphQLErrorCodes =
    queryError && CombinedGraphQLErrors.is(queryError) ? queryError.errors.map(error => error.extensions?.code) : [];
  const hasQueryLengthError = graphQLErrorCodes.includes('product/invalid-args');
  const showQueryLengthError = queryLengthError || hasQueryLengthError;
  const networkError = result.error !== undefined && !hasQueryLengthError;

  const buildUrl = (next: {
    q?: string | null;
    platform?: string | null;
    secondary?: string | null;
    product?: string | null;
  }) => buildExplorerUrl(options.basePath, filters, options.secondaryParamKey, next);

  const navigateTo = (next: {
    q?: string | null;
    platform?: string | null;
    secondary?: string | null;
    product?: string | null;
  }) => navigate(buildUrl(next));

  const onLoadMore = () => {
    if (loadingMore || !hasNextPage || endCursor === null) {
      return;
    }
    setLoadingMore(true);
    setLoadMoreError(false);
    (observable as ObservableQuery)
      .fetchMore({
        variables: { after: endCursor },
        updateQuery: (previous: unknown, { fetchMoreResult }: { fetchMoreResult: unknown }) => {
          const previousConnection = options.getConnection(previous);
          const incomingConnection = options.getConnection(fetchMoreResult);
          if (!incomingConnection) {
            return previous as never;
          }
          const previousEdges = (options.getEdges(previous) ?? []) as EdgeLike<TNode>[];
          const incomingEdges = (options.getEdges(fetchMoreResult) ?? []) as EdgeLike<TNode>[];
          const previousIds = new Set(
            previousEdges
              .map(edge => edge?.node && options.getNodeId(edge.node))
              .filter((id): id is string => typeof id === 'string')
          );
          const mergedEdges = [
            ...previousEdges,
            ...incomingEdges.filter(edge => {
              const id = edge?.node ? options.getNodeId(edge.node) : undefined;
              return typeof id === 'string' && !previousIds.has(id);
            }),
          ];
          return {
            ...(previous as Record<string, unknown>),
            [options.connectionKey]: {
              ...(incomingConnection as Record<string, unknown>),
              edges: mergedEdges,
            },
          } as never;
        },
      })
      .catch((e: unknown) => {
        console.error(options.loadMoreLabel, e);
        setLoadMoreError(true);
      })
      .finally(() => {
        setLoadingMore(false);
      });
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (product === null) {
      suggest(value);
    }
  };

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    clearSuggestions();
    navigate(buildUrl({ q: searchInput.trim().length > 0 ? searchInput : null }));
  };

  const onSuggestionSelect = (selected: ProductSuggestion) => {
    clearSuggestions();
    setSearchInput('');
    navigate(buildUrl({ q: null, product: selected.slug }));
  };

  const onSearchInputFocus = () => {
    if (product === null && searchInput.trim().length > 0) {
      suggest(searchInput);
    }
  };

  const onPlatformChange = (value: string) => {
    navigate(buildUrl({ platform: value.length > 0 ? value : null }));
  };

  const onClearFilters = () => {
    setSearchInput('');
    clearSuggestions();
    if (typeof options.clearFiltersTo === 'function') {
      navigate(options.clearFiltersTo(product));
      return;
    }
    navigate(options.clearFiltersTo);
  };

  const retry = () => {
    observable.refetch().catch((e: unknown) => {
      console.error(options.refetchLabel, e);
    });
  };

  const loading = result.loading && cards.length === 0;

  return {
    loading,
    error: result.error,
    queryLengthError: showQueryLengthError,
    networkError,
    cards,
    totalCount: connection?.totalCount ?? 0,
    hasNextPage,
    loadingMore,
    loadMoreError,
    searchInput,
    platform,
    secondary,
    product,
    query,
    onSearchInputChange: handleSearchInputChange,
    onSearchSubmit,
    onPlatformChange,
    onSecondaryChange: (value: string) => navigateTo({ secondary: value.length > 0 ? value : null }),
    onClearFilters,
    onLoadMore,
    retry,
    suggestions,
    isSearchingSuggestions,
    onSuggestionSelect,
    onSuggestClose: clearSuggestions,
    onSearchInputFocus,
  };
}
