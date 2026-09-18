'use client';

import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient } from '@apollo/client/react';
import { VisualScreenshotsOnExplorerDocument } from '@darun/provider-graphql';
import type { VisualPlatform, VisualScreenType } from '@darun/provider-graphql';
import { useNavigate, useSearchParams } from '@darun/utils-router';
import { useEffect, useMemo, useState } from 'react';
import { VISUAL_SCREENSHOTS_PAGE_SIZE } from './documents';
import { isVisualPlatformValue, isVisualScreenTypeValue } from './visualClassifications';

const VISUAL_QUERY_MAX_LENGTH = 100;

export type ScreenshotCard = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  title: string | null;
  platform: VisualPlatform | null;
  screenType: VisualScreenType | null;
  product: { id: string; name: string; slug: string; logoUrl: string };
};

export type ScreenshotExplorerState = {
  loading: boolean;
  error: Error | undefined;
  queryLengthError: boolean;
  networkError: boolean;
  cards: ScreenshotCard[];
  totalCount: number;
  hasNextPage: boolean;
  loadingMore: boolean;
  loadMoreError: boolean;
  searchInput: string;
  platform: string | null;
  screenType: string | null;
  product: string | null;
  query: string | null;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent) => void;
  onPlatformChange: (value: string) => void;
  onScreenTypeChange: (value: string) => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
  retry: () => void;
};

function readFilterParams(searchParams: URLSearchParams) {
  const query = searchParams.get('q');
  const platformParam = searchParams.get('platform');
  const screenTypeParam = searchParams.get('screenType');
  const product = searchParams.get('product');

  return {
    query: query !== null && query.trim().length > 0 ? query : null,
    platform: isVisualPlatformValue(platformParam) ? platformParam : null,
    screenType: isVisualScreenTypeValue(screenTypeParam) ? screenTypeParam : null,
    product: product !== null && product.trim().length > 0 ? product : null,
  };
}

export function useScreenshotExplorer(): ScreenshotExplorerState {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const apolloClient = useApolloClient();

  const filters = useMemo(() => readFilterParams(searchParams), [searchParams]);
  const { query, platform, screenType, product } = filters;

  const [searchInput, setSearchInput] = useState(query ?? '');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 검색 파라미터 동기화에 필요
    setSearchInput(query ?? '');
  }, [query]);

  const queryLengthError = query !== null && query.trim().length > VISUAL_QUERY_MAX_LENGTH;

  const observable = useMemo(
    () =>
      apolloClient.watchQuery({
        query: VisualScreenshotsOnExplorerDocument,
        variables: {
          query: queryLengthError ? null : query,
          platform,
          screenType,
          productSlug: product,
          first: VISUAL_SCREENSHOTS_PAGE_SIZE,
          after: null,
        },
        notifyOnNetworkStatusChange: true,
      }),
    [apolloClient, query, platform, screenType, product, queryLengthError]
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

  const edges = result.data?.visualScreenshots?.edges ?? [];
  const cards: ScreenshotCard[] = edges.flatMap(edge => {
    const node = edge?.node;
    const productNode = node?.product;
    if (!node || !productNode) {
      return [];
    }
    return [
      {
        id: node.id ?? '',
        imageUrl: node.imageUrl ?? '',
        imageAlt: node.imageAlt ?? '',
        title: node.title ?? null,
        platform: node.platform ?? null,
        screenType: node.screenType ?? null,
        product: {
          id: productNode.id ?? '',
          name: productNode.name ?? '',
          slug: productNode.slug ?? '',
          logoUrl: productNode.logoUrl ?? '',
        },
      },
    ];
  });
  const connection = result.data?.visualScreenshots;
  const hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
  const endCursor = connection?.pageInfo?.endCursor ?? null;

  const queryError = result.error;
  const graphQLErrorCodes =
    queryError && CombinedGraphQLErrors.is(queryError) ? queryError.errors.map(error => error.extensions?.code) : [];
  const hasQueryLengthError = graphQLErrorCodes.includes('product/invalid-args');
  const showQueryLengthError = queryLengthError || hasQueryLengthError;
  const networkError = result.error !== undefined && !hasQueryLengthError;

  const buildUrl = (next: { q?: string | null; platform?: string | null; screenType?: string | null }) => {
    const params = new URLSearchParams();
    const nextQuery = next.q !== undefined ? next.q : query;
    const nextPlatform = next.platform !== undefined ? next.platform : platform;
    const nextScreenType = next.screenType !== undefined ? next.screenType : screenType;
    if (nextQuery !== null) {
      params.set('q', nextQuery);
    }
    if (nextPlatform !== null) {
      params.set('platform', nextPlatform);
    }
    if (nextScreenType !== null) {
      params.set('screenType', nextScreenType);
    }
    if (product !== null) {
      params.set('product', product);
    }
    const queryString = params.toString();
    return queryString.length > 0 ? `/?${queryString}` : '/';
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
          if (!fetchMoreResult.visualScreenshots) {
            return previous;
          }
          const previousEdges = previous.visualScreenshots?.edges ?? [];
          const incomingEdges = fetchMoreResult.visualScreenshots.edges ?? [];
          const mergedEdges = [
            ...previousEdges,
            ...incomingEdges.filter(
              edge => !previousEdges.some(previousEdge => previousEdge?.node?.id === edge?.node?.id)
            ),
          ];
          return {
            ...previous,
            visualScreenshots: {
              ...fetchMoreResult.visualScreenshots,
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

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate(buildUrl({ q: searchInput.trim().length > 0 ? searchInput : null }));
  };

  const onPlatformChange = (value: string) => {
    navigate(buildUrl({ platform: value.length > 0 ? value : null }));
  };

  const onScreenTypeChange = (value: string) => {
    navigate(buildUrl({ screenType: value.length > 0 ? value : null }));
  };

  const onClearFilters = () => {
    setSearchInput('');
    navigate(product !== null ? `/?product=${encodeURIComponent(product)}` : '/');
  };

  const retry = () => {
    observable.refetch().catch(() => undefined);
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
    screenType,
    product,
    query,
    onSearchInputChange: setSearchInput,
    onSearchSubmit,
    onPlatformChange,
    onScreenTypeChange,
    onClearFilters,
    onLoadMore,
    retry,
  };
}
