'use client';

import { useApolloClient } from '@apollo/client/react';
import { AppCollectionsOnVisualAppsDocument, AppDetailOnVisualAppsDocument } from '@darun/provider-graphql';
import { useEffect, useState } from 'react';
import { VISUAL_APP_DETAIL_COLLECTION_SIZE } from './documents';

export type AppDetailCollectionScreenshot = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  title: string | null;
};

export type AppDetailCollectionFlow = {
  id: string;
  title: string;
  stepCount: number;
  coverImageUrl: string;
  coverImageAlt: string;
};

export type AppDetailData = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string | null;
  logoUrl: string;
  screenshots: AppDetailCollectionScreenshot[];
  screenshotTotalCount: number;
  flows: AppDetailCollectionFlow[];
  flowTotalCount: number;
};

export type AppDetailState = {
  status: 'loading' | 'not-found' | 'error' | 'loaded';
  detail: AppDetailData | null;
  retry: () => void;
};

export function useAppDetail(slug: string): AppDetailState {
  const apolloClient = useApolloClient();
  const [queryState, setQueryState] = useState<
    { status: 'loading' } | { status: 'not-found' } | { status: 'error' } | { status: 'loaded'; detail: AppDetailData }
  >({ status: 'loading' });
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 재시도 시 로딩 상태 리셋에 필요
    setQueryState({ status: 'loading' });

    Promise.all([
      apolloClient.query({
        query: AppDetailOnVisualAppsDocument,
        variables: { slug },
        fetchPolicy: 'no-cache',
      }),
      apolloClient.query({
        query: AppCollectionsOnVisualAppsDocument,
        variables: { productSlug: slug, first: VISUAL_APP_DETAIL_COLLECTION_SIZE },
        fetchPolicy: 'no-cache',
      }),
    ])
      .then(([detailResult, collectionsResult]) => {
        if (!active) {
          return;
        }
        const product = detailResult.data?.productBySlug ?? null;
        if (product === null) {
          setQueryState({ status: 'not-found' });
          return;
        }
        const screenshots = (collectionsResult.data?.visualScreenshots.edges ?? []).flatMap(edge => {
          const node = edge?.node;
          if (!node?.id || !node.imageUrl) {
            return [];
          }
          return [
            {
              id: node.id,
              imageUrl: node.imageUrl,
              imageAlt: node.imageAlt ?? '',
              title: node.title ?? null,
            },
          ];
        });
        const flows = (collectionsResult.data?.visualFlows.edges ?? []).flatMap(edge => {
          const node = edge?.node;
          if (!node?.id || !node.coverScreenshot?.imageUrl) {
            return [];
          }
          return [
            {
              id: node.id,
              title: node.title ?? '',
              stepCount: node.stepCount ?? 0,
              coverImageUrl: node.coverScreenshot.imageUrl,
              coverImageAlt: node.coverScreenshot.imageAlt ?? '',
            },
          ];
        });
        setQueryState({
          status: 'loaded',
          detail: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            summary: product.summary ?? '',
            description: product.description ?? null,
            logoUrl: product.logoUrl ?? '',
            screenshots,
            screenshotTotalCount: collectionsResult.data?.visualScreenshots.totalCount ?? screenshots.length,
            flows,
            flowTotalCount: collectionsResult.data?.visualFlows.totalCount ?? flows.length,
          },
        });
      })
      .catch((e: unknown) => {
        console.error('Failed to load app detail', e);
        if (active) {
          setQueryState({ status: 'error' });
        }
      });

    return () => {
      active = false;
    };
  }, [apolloClient, slug, requestKey]);

  return {
    status: queryState.status,
    detail: queryState.status === 'loaded' ? queryState.detail : null,
    retry: () => setRequestKey(key => key + 1),
  };
}
