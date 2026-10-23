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
  element?: string | null;
};

export type ExplorerSearchDraft = {
  searchInput: string;
  setSearchInput: (value: string) => void;
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
  element?: string | null;
  product: string | null;
  query: string | null;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent) => void;
  onPlatformChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onElementChange?: (value: string) => void;
  onClearFilters: () => void;
  onProductClear: () => void;
  onLoadMore: () => void;
  retry: () => void;
  suggestions: ProductSuggestion[];
  isSearchingSuggestions: boolean;
  onSuggestionSelect: (product: ProductSuggestion) => void;
  onSuggestClose: () => void;
  onSearchInputFocus: () => void;
  pagination?: { firstHref: string; nextHref: string | null; isFirstPage: boolean };
};

type BuildUrlNext = {
  q?: string | null;
  platform?: string | null;
  secondary?: string | null;
  product?: string | null;
  element?: string | null;
};

type ExplorerQueryOptions<TNode, TCard> = {
  document: DocumentNode;
  connectionKey: string;
  pageSize: number;
  basePath: string;
  secondaryParamKey: string;
  elementParamKey?: string;
  clearFiltersTo: string | ((product: string | null) => string);
  readFilters: (searchParams: URLSearchParams) => ExplorerFilters;
  buildVariables: (filters: ExplorerFilters) => Record<string, unknown>;
  mapEdgeToCard: (node: TNode) => TCard | null;
  getEdges: (data: unknown) => Array<{ node?: TNode | null } | null> | undefined;
  getConnection: (data: unknown) =>
    | {
        totalCount?: number;
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      }
    | undefined;
  getNodeId: (node: TNode) => string | undefined;
  refetchLabel: string;
  loadMoreLabel: string;
  boundedPagination?: boolean;
};

type EdgeLike<TNode> = { node?: TNode | null } | null;

export function readExplorerQueryParam(searchParams: URLSearchParams) {
  const rawQuery = searchParams.get('q');
  return rawQuery !== null && rawQuery.trim().length > 0 ? rawQuery.trim() : null;
}

export function isOverlongExplorerQuery(query: string | null): boolean {
  return query !== null && query.length > VISUAL_QUERY_MAX_LENGTH;
}

export function readExplorerProductParam(searchParams: URLSearchParams) {
  const rawProduct = searchParams.get('product');
  return rawProduct !== null && rawProduct.trim().length > 0 ? rawProduct.trim() : null;
}

export function buildExplorerUrl(
  basePath: string,
  filters: ExplorerFilters,
  secondaryParamKey: string,
  next: {
    q?: string | null;
    platform?: string | null;
    secondary?: string | null;
    product?: string | null;
    element?: string | null;
  },
  elementParamKey = 'element'
) {
  const params = new URLSearchParams();
  const nextQuery = next.q !== undefined ? next.q : filters.query;
  const nextPlatform = next.platform !== undefined ? next.platform : filters.platform;
  const nextSecondary = next.secondary !== undefined ? next.secondary : filters.secondary;
  const nextProduct = next.product !== undefined ? next.product : filters.product;
  const nextElement = next.element !== undefined ? next.element : (filters.element ?? null);
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
  if (nextElement !== null) {
    params.set(elementParamKey, nextElement);
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

export function useExplorerQuery<TNode, TCard>(
  options: ExplorerQueryOptions<TNode, TCard>,
  searchDraft?: ExplorerSearchDraft
) {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const apolloClient = useApolloClient();

  const { suggestions, isSearching: isSearchingSuggestions, clearSuggestions, suggest } = useProductSearchSuggest();

  const filters = useMemo(() => options.readFilters(searchParams), [options, searchParams]);
  const { query, platform, secondary, product } = filters;
  const element = filters.element ?? null;
  const elementParamKey = options.elementParamKey ?? 'element';

  const [localSearchInput, setLocalSearchInput] = useState(query ?? '');
  const searchInput = searchDraft?.searchInput ?? localSearchInput;
  const setSearchInput = searchDraft?.setSearchInput ?? setLocalSearchInput;
  const ownsSearchDraft = searchDraft === undefined;
  useEffect(() => {
    if (ownsSearchDraft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 검색 파라미터 동기화에 필요
      setLocalSearchInput(query ?? '');
    }
  }, [query, ownsSearchDraft]);

  const queryLengthError = isOverlongExplorerQuery(query);
  const after = options.boundedPagination ? searchParams.get('after') : null;

  const observable = useMemo(
    () =>
      apolloClient.watchQuery({
        query: options.document,
        variables: {
          ...options.buildVariables({
            query: queryLengthError ? null : query,
            platform,
            secondary,
            product,
            element,
          }),
          first: options.pageSize,
          after,
        },
        notifyOnNetworkStatusChange: true,
        fetchPolicy: options.boundedPagination ? 'no-cache' : 'cache-first',
      }),
    [apolloClient, options, query, platform, secondary, product, element, queryLengthError, after]
  );

  const [snapshot, setSnapshot] = useState(() => ({ observable, result: observable.getCurrentResult() }));
  const result = snapshot.observable === observable ? snapshot.result : observable.getCurrentResult();
  useEffect(() => {
    const subscription = observable.subscribe(nextResult => {
      setSnapshot({ observable, result: { ...nextResult } });
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

  const buildUrl = (next: BuildUrlNext) =>
    buildExplorerUrl(options.basePath, filters, options.secondaryParamKey, next, elementParamKey);

  const navigateTo = (next: BuildUrlNext) => navigate(buildUrl(next));

  const onLoadMore = () => {
    if (options.boundedPagination) {
      if (hasNextPage && endCursor !== null) {
        const params = new URLSearchParams(searchParams);
        params.set('after', endCursor);
        navigate(`${options.basePath}?${params}`);
      }
      return;
    }
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
    navigateTo({ platform: value.length > 0 ? value : null });
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
    element,
    product,
    query,
    onSearchInputChange: handleSearchInputChange,
    onSearchSubmit,
    onPlatformChange,
    onSecondaryChange: (value: string) => navigateTo({ secondary: value.length > 0 ? value : null }),
    onElementChange: (value: string) => navigateTo({ element: value.length > 0 ? value : null }),
    onClearFilters,
    onProductClear: () => {
      clearSuggestions();
      navigateTo({ product: null });
    },
    onLoadMore,
    retry,
    pagination: options.boundedPagination
      ? {
          firstHref: buildUrl({}),
          nextHref:
            hasNextPage && endCursor !== null
              ? (() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('after', endCursor);
                  return `${options.basePath}?${params}`;
                })()
              : null,
          isFirstPage: after === null,
        }
      : undefined,
    suggestions,
    isSearchingSuggestions,
    onSuggestionSelect,
    onSuggestClose: clearSuggestions,
    onSearchInputFocus,
  };
}
