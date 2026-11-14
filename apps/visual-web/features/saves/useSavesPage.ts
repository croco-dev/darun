'use client';

import { useApolloClient } from '@apollo/client/react';
import {
  MyVisualSavedFlowsDocument,
  type MyVisualSavedFlowsQuery,
  MyVisualSavedScreenshotsDocument,
  type MyVisualSavedScreenshotsQuery,
  type VisualFlowType,
  type VisualPlatform,
  type VisualScreenType,
} from '@darun/provider-graphql';
import { useNavigate, useSearchParams } from '@darun/utils-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveVisualFlowType, resolveVisualPlatform } from '../explorer/visualTaxonomy';
import type { FlowCard } from '../flows/useFlowExplorer';
import type { ScreenshotCard } from '../screenshots/useScreenshotExplorer';
import { VISUAL_SAVES_PAGE_SIZE } from './saveDocuments';
import { useVisualAccount } from './useVisualAccount';

export type SavesTab = 'screenshots' | 'flows';

export type SavesPageState = {
  tab: SavesTab;
  onTabChange: (tab: SavesTab) => void;
  user: ReturnType<typeof useVisualAccount>;
} & (
  | { status: 'loading' }
  | { status: 'login-required' }
  | { status: 'error'; retry: () => void }
  | {
      status: 'loaded';
      tab: SavesTab;
      onTabChange: (tab: SavesTab) => void;
      screenshotCards: ScreenshotCard[];
      flowCards: FlowCard[];
      screenshotTotalCount: number;
      flowTotalCount: number;
      hasNextPage: boolean;
      loadingMore: boolean;
      loadMoreError: boolean;
      onLoadMore: () => void;
      retryLoadMore: () => void;
    }
);

type SavedScreenshotNode = NonNullable<
  NonNullable<MyVisualSavedScreenshotsQuery['myVisualSavedScreenshots']['edges'][number]['node']>
>;

type SavedFlowNode = NonNullable<NonNullable<MyVisualSavedFlowsQuery['myVisualSavedFlows']['edges'][number]['node']>>;

function toScreenshotCard(node: SavedScreenshotNode): ScreenshotCard | null {
  const productNode = node.product;
  if (!productNode) {
    return null;
  }
  return {
    id: node.id ?? '',
    imageUrl: node.imageUrl ?? '',
    imageAlt: node.imageAlt ?? '',
    title: node.title ?? null,
    platform: (node.platform ?? null) as VisualPlatform | null,
    screenType: (node.screenType ?? null) as VisualScreenType | null,
    product: {
      id: productNode.id ?? '',
      name: productNode.name ?? '',
      slug: productNode.slug ?? '',
      logoUrl: productNode.logoUrl ?? '',
      summary: productNode.summary ?? '',
    },
  };
}

function toFlowCard(node: SavedFlowNode): FlowCard | null {
  const cover = node.coverScreenshot;
  const productNode = node.product;
  if (!cover || !productNode) {
    return null;
  }
  return {
    id: node.id ?? '',
    title: node.title ?? '',
    description: node.description ?? '',
    platform: resolveVisualPlatform(node.platform),
    flowType: resolveVisualFlowType(node.flowType as VisualFlowType),
    stepCount: node.stepCount ?? 0,
    coverImageUrl: cover.imageUrl ?? '',
    coverImageAlt: cover.imageAlt ?? '',
    product: {
      id: productNode.id ?? '',
      name: productNode.name ?? '',
      slug: productNode.slug ?? '',
      logoUrl: productNode.logoUrl ?? '',
    },
  };
}

function appendSavedCards<T extends { id: string }>(previous: T[], incoming: T[]): T[] {
  const ids = new Set(previous.map(card => card.id));
  return [
    ...previous,
    ...incoming.filter(card => {
      if (ids.has(card.id)) return false;
      ids.add(card.id);
      return true;
    }),
  ];
}

function isUnauthorized(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const errors = (error as { graphQLErrors?: Array<{ extensions?: { code?: string } }> }).graphQLErrors;
  if (errors?.some(e => e.extensions?.code === 'UNAUTHENTICATED')) {
    return true;
  }
  const message = error instanceof Error ? error.message : '';
  return message.includes('UNAUTHENTICATED') || message.includes('Unauthorized');
}

export function isSavesTabValue(value: string | null): value is SavesTab {
  return value === 'screenshots' || value === 'flows';
}

export function readSavesTabParam(searchParams: URLSearchParams): SavesTab {
  const raw = searchParams.get('tab');
  return isSavesTabValue(raw) ? raw : 'screenshots';
}

/**
 * M4 내 저장 페이지 상태. 로그인 필수 — 미인증 시 login-required.
 * 탭별 화면/플로 카드 목록, 저장 시각 내림차순(LATEST), 저장 경계 커서 더보기.
 * M5: 탭 상태를 URL(?tab=)과 동기화.
 */
export function useSavesPage(initialTab: SavesTab = 'screenshots'): SavesPageState {
  const apolloClient = useApolloClient();
  const user = useVisualAccount();
  const account = user == null ? user : user.id;
  const generations = useRef<Record<SavesTab, number>>({
    screenshots: 0,
    flows: 0,
  });
  const [dataAccount, setDataAccount] = useState<string | null | undefined>(undefined);
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const tab = isSavesTabValue(searchParams.get('tab')) ? readSavesTabParam(searchParams) : initialTab;
  const [statuses, setStatuses] = useState<Record<SavesTab, 'loading' | 'login-required' | 'error' | 'loaded'>>({
    screenshots: 'loading',
    flows: 'loading',
  });
  const status =
    account === undefined
      ? 'loading'
      : account === null
        ? 'login-required'
        : account !== dataAccount
          ? 'loading'
          : statuses[tab];
  const [screenshotCards, setScreenshotCards] = useState<ScreenshotCard[]>([]);
  const [flowCards, setFlowCards] = useState<FlowCard[]>([]);
  const [screenshotTotalCount, setScreenshotTotalCount] = useState(0);
  const [flowTotalCount, setFlowTotalCount] = useState(0);
  const [screenshotCursor, setScreenshotCursor] = useState<string | null>(null);
  const [flowCursor, setFlowCursor] = useState<string | null>(null);
  const [screenshotHasNext, setScreenshotHasNext] = useState(false);
  const [flowHasNext, setFlowHasNext] = useState(false);
  const [screenshotLoadingMore, setScreenshotLoadingMore] = useState(false);
  const [flowLoadingMore, setFlowLoadingMore] = useState(false);
  const [screenshotLoadMoreError, setScreenshotLoadMoreError] = useState(false);
  const [flowLoadMoreError, setFlowLoadMoreError] = useState(false);
  if (account !== dataAccount) {
    setDataAccount(account);
    setScreenshotCards([]);
    setFlowCards([]);
    setScreenshotTotalCount(0);
    setFlowTotalCount(0);
    setScreenshotCursor(null);
    setFlowCursor(null);
    setScreenshotHasNext(false);
    setFlowHasNext(false);
    setScreenshotLoadingMore(false);
    setFlowLoadingMore(false);
    setScreenshotLoadMoreError(false);
    setFlowLoadMoreError(false);
    setStatuses({ screenshots: 'loading', flows: 'loading' });
  }

  const loadFirstPage = useCallback(
    async (target: SavesTab) => {
      const requestGeneration = ++generations.current[target];
      setStatuses(previous => ({ ...previous, [target]: 'loading' }));
      try {
        if (target === 'screenshots') {
          const result = await apolloClient.query({
            query: MyVisualSavedScreenshotsDocument,
            variables: { first: VISUAL_SAVES_PAGE_SIZE, page: 0 },
            fetchPolicy: 'no-cache',
            context: { queryDeduplication: false },
          });
          if (generations.current[target] !== requestGeneration) return;
          const connection = result.data?.myVisualSavedScreenshots;
          setScreenshotCards(
            (connection?.edges ?? []).flatMap(edge => {
              const card = edge.node ? toScreenshotCard(edge.node) : null;
              return card ? [card] : [];
            })
          );
          setScreenshotTotalCount(connection?.totalCount ?? 0);
          setScreenshotCursor(connection?.pageInfo?.endCursor ?? null);
          setScreenshotHasNext(connection?.pageInfo?.hasNextPage ?? false);
        } else {
          const result = await apolloClient.query({
            query: MyVisualSavedFlowsDocument,
            variables: { first: VISUAL_SAVES_PAGE_SIZE, page: 0 },
            fetchPolicy: 'no-cache',
            context: { queryDeduplication: false },
          });
          if (generations.current[target] !== requestGeneration) return;
          const connection = result.data?.myVisualSavedFlows;
          setFlowCards(
            (connection?.edges ?? []).flatMap(edge => {
              const card = edge.node ? toFlowCard(edge.node) : null;
              return card ? [card] : [];
            })
          );
          setFlowTotalCount(connection?.totalCount ?? 0);
          setFlowCursor(connection?.pageInfo?.endCursor ?? null);
          setFlowHasNext(connection?.pageInfo?.hasNextPage ?? false);
        }
        setStatuses(previous => ({ ...previous, [target]: 'loaded' }));
      } catch (error) {
        if (generations.current[target] !== requestGeneration) return;
        setStatuses(previous => ({
          ...previous,
          [target]: isUnauthorized(error) ? 'login-required' : 'error',
        }));
      }
    },
    [apolloClient]
  );

  useEffect(() => {
    if (!account) return;
    const accountGenerations = generations.current;
    void loadFirstPage('screenshots');
    void loadFirstPage('flows');
    return () => {
      accountGenerations.screenshots += 1;
      accountGenerations.flows += 1;
    };
  }, [account, loadFirstPage]);

  const retry = useCallback(() => {
    void loadFirstPage(tab);
  }, [loadFirstPage, tab]);

  const onTabChange = useCallback(
    (next: SavesTab) => {
      navigate(next === 'screenshots' ? '/saves' : `/saves?tab=${next}`, { preventScrollReset: true });
    },
    [navigate]
  );

  const onLoadMore = useCallback(() => {
    const requestGeneration = generations.current[tab];
    const setTabLoadingMore = tab === 'screenshots' ? setScreenshotLoadingMore : setFlowLoadingMore;
    const setTabLoadMoreError = tab === 'screenshots' ? setScreenshotLoadMoreError : setFlowLoadMoreError;
    const isTabLoadingMore = tab === 'screenshots' ? screenshotLoadingMore : flowLoadingMore;
    if (isTabLoadingMore || !(tab === 'screenshots' ? screenshotHasNext : flowHasNext)) {
      return;
    }
    const after = tab === 'screenshots' ? screenshotCursor : flowCursor;
    if (!after) return;
    setTabLoadingMore(true);
    setTabLoadMoreError(false);
    const request =
      tab === 'screenshots'
        ? apolloClient.query({
            query: MyVisualSavedScreenshotsDocument,
            variables: { first: VISUAL_SAVES_PAGE_SIZE, after },
            fetchPolicy: 'no-cache',
            context: { queryDeduplication: false },
          })
        : apolloClient.query({
            query: MyVisualSavedFlowsDocument,
            variables: { first: VISUAL_SAVES_PAGE_SIZE, after },
            fetchPolicy: 'no-cache',
            context: { queryDeduplication: false },
          });
    request
      .then(result => {
        if (generations.current[tab] !== requestGeneration) return;
        if (tab === 'screenshots') {
          const data = result.data as MyVisualSavedScreenshotsQuery | undefined;
          const connection = data?.myVisualSavedScreenshots;
          const cards = (connection?.edges ?? []).flatMap(edge => {
            const card = edge?.node ? toScreenshotCard(edge.node) : null;
            return card ? [card] : [];
          });
          setScreenshotCards(prev => appendSavedCards(prev, cards));
          setScreenshotHasNext(connection?.pageInfo?.hasNextPage ?? false);
          setScreenshotCursor(connection?.pageInfo?.endCursor ?? null);
        } else {
          const data = result.data as MyVisualSavedFlowsQuery | undefined;
          const connection = data?.myVisualSavedFlows;
          const cards = (connection?.edges ?? []).flatMap(edge => {
            const card = edge?.node ? toFlowCard(edge.node) : null;
            return card ? [card] : [];
          });
          setFlowCards(prev => appendSavedCards(prev, cards));
          setFlowHasNext(connection?.pageInfo?.hasNextPage ?? false);
          setFlowCursor(connection?.pageInfo?.endCursor ?? null);
        }
      })
      .catch((e: unknown) => {
        if (generations.current[tab] !== requestGeneration) return;
        if (isUnauthorized(e)) {
          setStatuses(previous => ({ ...previous, [tab]: 'login-required' }));
          return;
        }
        console.error('Failed to load more visual saves', e);
        setTabLoadMoreError(true);
      })
      .finally(() => {
        if (generations.current[tab] !== requestGeneration) return;
        setTabLoadingMore(false);
      });
  }, [
    apolloClient,
    tab,
    screenshotCursor,
    flowCursor,
    screenshotLoadingMore,
    flowLoadingMore,
    screenshotHasNext,
    flowHasNext,
  ]);

  const retryLoadMore = useCallback(() => {
    if (tab === 'screenshots') {
      setScreenshotLoadMoreError(false);
    } else {
      setFlowLoadMoreError(false);
    }
    onLoadMore();
  }, [tab, onLoadMore]);

  if (status === 'loading') {
    return { status: 'loading', tab, onTabChange, user };
  }
  if (status === 'login-required') {
    return { status: 'login-required', tab, onTabChange, user };
  }
  if (status === 'error') {
    return { status: 'error', retry, tab, onTabChange, user };
  }
  const loadingMore = tab === 'screenshots' ? screenshotLoadingMore : flowLoadingMore;
  const loadMoreError = tab === 'screenshots' ? screenshotLoadMoreError : flowLoadMoreError;
  return {
    status: 'loaded',
    user,
    tab,
    onTabChange,
    screenshotCards,
    flowCards,
    screenshotTotalCount,
    flowTotalCount,
    hasNextPage: tab === 'screenshots' ? screenshotHasNext : flowHasNext,
    loadingMore,
    loadMoreError,
    onLoadMore,
    retryLoadMore,
  };
}
