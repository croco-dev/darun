'use client';

import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient } from '@apollo/client/react';
import { VisualFlowsOnExplorerDocument } from '@darun/provider-graphql';
import type { VisualFlowType, VisualPlatform } from '@darun/provider-graphql';
import { useNavigate, useSearchParams } from '@darun/utils-router';
import { useEffect, useMemo, useState } from 'react';
import { useProductSearchSuggest } from '../product-search/useProductSearchSuggest';
import type { ProductSuggestion } from '../product-search/useProductSearchSuggest';
import { VISUAL_FLOWS_PAGE_SIZE } from './explorerDocuments';
import { isVisualFlowTypeValue, isVisualPlatformValue } from './flowClassifications';

const VISUAL_QUERY_MAX_LENGTH = 100;

export type FlowCard = {
  id: string;
  title: string;
  description: string;
  platform: VisualPlatform;
  flowType: VisualFlowType;
  stepCount: number;
  coverImageUrl: string;
  coverImageAlt: string;
  product: { id: string; name: string; slug: string; logoUrl: string };
};

export type FlowExplorerState = {
  loading: boolean;
  queryLengthError: boolean;
  networkError: boolean;
  cards: FlowCard[];
  totalCount: number;
  hasNextPage: boolean;
  loadingMore: boolean;
  loadMoreError: boolean;
  searchInput: string;
  platform: string | null;
  flowType: string | null;
  product: string | null;
  query: string | null;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent) => void;
  onPlatformChange: (value: string) => void;
  onFlowTypeChange: (value: string) => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
  retry: () => void;
  suggestions: ProductSuggestion[];
  isSearchingSuggestions: boolean;
  onSuggestionSelect: (product: ProductSuggestion) => void;
  onSuggestClose: () => void;
  onSearchInputFocus: () => void;
};

function readFilterParams(searchParams: URLSearchParams) {
  const rawQuery = searchParams.get('q');
  const rawPlatform = searchParams.get('platform');
  const rawFlowType = searchParams.get('flowType');
  const rawProduct = searchParams.get('product');
  return {
    query: rawQuery !== null && rawQuery.length > 0 ? rawQuery : null,
    platform: rawPlatform !== null && isVisualPlatformValue(rawPlatform) ? rawPlatform : null,
    flowType: rawFlowType !== null && isVisualFlowTypeValue(rawFlowType) ? rawFlowType : null,
    product: rawProduct !== null && rawProduct.length > 0 ? rawProduct : null,
  };
}

export function useFlowExplorer(): FlowExplorerState {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const apolloClient = useApolloClient();

  const { suggestions, isSearching: isSearchingSuggestions, clearSuggestions, suggest } = useProductSearchSuggest();

  const filters = useMemo(() => readFilterParams(searchParams), [searchParams]);
  const { query, platform, flowType, product } = filters;

  const [searchInput, setSearchInput] = useState(query ?? '');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 검색 파라미터 동기화에 필요
    setSearchInput(query ?? '');
  }, [query]);

  const queryLengthError = query !== null && query.trim().length > VISUAL_QUERY_MAX_LENGTH;

  const observable = useMemo(
    () =>
      apolloClient.watchQuery({
        query: VisualFlowsOnExplorerDocument,
        variables: {
          query: queryLengthError ? null : query,
          platform,
          flowType,
          productSlug: product,
          first: VISUAL_FLOWS_PAGE_SIZE,
          after: null,
        },
        notifyOnNetworkStatusChange: true,
      }),
    [apolloClient, query, platform, flowType, product, queryLengthError]
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

  const edges = result.data?.visualFlows?.edges ?? [];
  const cards: FlowCard[] = edges.flatMap(edge => {
    const node = edge?.node;
    const cover = node?.coverScreenshot;
    const productNode = node?.product;
    if (!node || !cover || !productNode) {
      return [];
    }
    return [
      {
        id: node.id ?? '',
        title: node.title ?? '',
        description: node.description ?? '',
        platform: (node.platform ?? 'WEB') as VisualPlatform,
        flowType: (node.flowType ?? 'OTHER') as VisualFlowType,
        stepCount: node.stepCount ?? 0,
        coverImageUrl: cover.imageUrl ?? '',
        coverImageAlt: cover.imageAlt ?? '',
        product: {
          id: productNode.id ?? '',
          name: productNode.name ?? '',
          slug: productNode.slug ?? '',
          logoUrl: productNode.logoUrl ?? '',
        },
      },
    ];
  });
  const connection = result.data?.visualFlows;
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
    flowType?: string | null;
    product?: string | null;
  }) => {
    const params = new URLSearchParams();
    const nextQuery = next.q !== undefined ? next.q : query;
    const nextPlatform = next.platform !== undefined ? next.platform : platform;
    const nextFlowType = next.flowType !== undefined ? next.flowType : flowType;
    const nextProduct = next.product !== undefined ? next.product : product;
    if (nextQuery !== null) {
      params.set('q', nextQuery);
    }
    if (nextPlatform !== null) {
      params.set('platform', nextPlatform);
    }
    if (nextFlowType !== null) {
      params.set('flowType', nextFlowType);
    }
    if (nextProduct !== null) {
      params.set('product', nextProduct);
    }
    const queryString = params.toString();
    return queryString.length > 0 ? `/flows?${queryString}` : '/flows';
  };

  const onLoadMore = () => {
    if (loadingMore || !hasNextPage || endCursor === null) {
      return;
    }
    setLoadingMore(true);
    setLoadMoreError(false);
    observable
      .fetchMore({
        variables: { after: endCursor },
        updateQuery: (previous, { fetchMoreResult }) => {
          if (!fetchMoreResult.visualFlows) {
            return previous;
          }
          const previousEdges = previous.visualFlows?.edges ?? [];
          const incomingEdges = fetchMoreResult.visualFlows.edges ?? [];
          const mergedEdges = [
            ...previousEdges,
            ...incomingEdges.filter(
              edge => !previousEdges.some(previousEdge => previousEdge?.node?.id === edge?.node?.id)
            ),
          ];
          return {
            ...previous,
            visualFlows: {
              ...fetchMoreResult.visualFlows,
              edges: mergedEdges,
            },
          };
        },
      })
      .catch(() => {
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

  const onFlowTypeChange = (value: string) => {
    navigate(buildUrl({ flowType: value.length > 0 ? value : null }));
  };

  const onClearFilters = () => {
    setSearchInput('');
    clearSuggestions();
    navigate(product !== null ? `/flows?product=${encodeURIComponent(product)}` : '/flows');
  };

  const retry = () => {
    observable.refetch().catch(() => undefined);
  };

  const loading = result.loading && cards.length === 0;

  return {
    loading,
    queryLengthError: showQueryLengthError,
    networkError,
    cards,
    totalCount: connection?.totalCount ?? 0,
    hasNextPage,
    loadingMore,
    loadMoreError,
    searchInput,
    platform,
    flowType,
    product,
    query,
    onSearchInputChange: handleSearchInputChange,
    onSearchSubmit,
    onPlatformChange,
    onFlowTypeChange,
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
