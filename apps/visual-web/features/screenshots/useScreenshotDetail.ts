'use client';

import { useApolloClient, useQuery } from '@apollo/client/react';
import {
  TrackVisualScreenshotViewDocument,
  VisualScreenshotOnDetailDocument,
  VisualSiblingScreenshotsOnDetailDocument,
} from '@darun/provider-graphql';
import type { VisualPlatform, VisualScreenType } from '@darun/provider-graphql';
import { useEffect, useRef, useState } from 'react';
import type { RelatedDetailState } from '../detail/RelatedDetailStatus';
import { VISUAL_SCREENSHOT_DETAIL_RELATED_FETCH_SIZE, VISUAL_SCREENSHOT_DETAIL_RELATED_SIZE } from './detailDocuments';
import { filterSiblingScreenshots, normalizeDetailFlows, siblingDisplayTotalCount } from './relatedCollections';

export type ScreenshotDetailRelatedScreenshot = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  title: string | null;
};

export type ScreenshotDetailRelatedFlow = {
  id: string;
  title: string;
  stepCount: number;
  coverImageUrl: string;
  coverImageAlt: string;
};

export type ScreenshotDetailData = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  title: string | null;
  platform: VisualPlatform | null;
  screenType: VisualScreenType | null;
  product: {
    id: string;
    name: string;
    slug: string;
    summary: string | null;
    logoUrl: string;
  };
  flows: ScreenshotDetailRelatedFlow[];
  relatedScreenshots: ScreenshotDetailRelatedScreenshot[];
  relatedScreenshotTotalCount: number;
};

export type InitialScreenshotDetail = NonNullable<
  import('@darun/provider-graphql').VisualScreenshotOnDetailQuery['visualScreenshot']
>;

export type ScreenshotDetailState = RelatedDetailState & {
  status: 'loading' | 'not-found' | 'error' | 'loaded';
  detail: ScreenshotDetailData | null;
  retry: () => void;
  hasMoreFlows: boolean;
  loadingMoreFlows: boolean;
  loadMoreFlowsError: boolean;
  loadMoreFlows: () => void;
};

export function useScreenshotDetail(id: string, initialDetail?: InitialScreenshotDetail): ScreenshotDetailState {
  const initial = initialDetail?.id === id ? initialDetail : undefined;
  const primary = useQuery(VisualScreenshotOnDetailDocument, {
    variables: { id },
    skip: initial !== undefined,
    fetchPolicy: 'no-cache',
  });
  const screenshot = initial ?? primary.data?.visualScreenshot;
  const related = useQuery(VisualSiblingScreenshotsOnDetailDocument, {
    variables: {
      id,
      productSlug: screenshot?.product.slug ?? '',
      first: VISUAL_SCREENSHOT_DETAIL_RELATED_FETCH_SIZE,
    },
    skip: !screenshot,
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
  });
  const requestingFlows = useRef(false);
  const [loadingMoreFlows, setLoadingMoreFlows] = useState(false);
  const [loadMoreFlowsError, setLoadMoreFlowsError] = useState(false);
  const relatedScreenshot = related.data?.visualScreenshot;
  const flowPage = relatedScreenshot?.id === id ? relatedScreenshot.flows : undefined;
  const after = flowPage?.pageInfo.hasNextPage ? flowPage.pageInfo.endCursor : null;

  function loadMoreFlows() {
    if (!after || requestingFlows.current) return;
    requestingFlows.current = true;
    setLoadingMoreFlows(true);
    setLoadMoreFlowsError(false);
    void related
      .fetchMore({
        variables: { flowAfter: after, includeSiblings: false },
        updateQuery: (previous, { fetchMoreResult }) => {
          const current = previous?.visualScreenshot;
          const next = fetchMoreResult.visualScreenshot;
          if (current?.id !== id || current.flows.pageInfo.endCursor !== after) return previous;
          if (next?.id !== id) return previous;
          return {
            ...previous,
            visualScreenshot: {
              ...current,
              flows: { ...next.flows, edges: [...current.flows.edges, ...next.flows.edges] },
            },
          };
        },
      })
      .then(result => {
        if (result.data?.visualScreenshot?.id !== id) setLoadMoreFlowsError(true);
      })
      .catch(() => setLoadMoreFlowsError(true))
      .finally(() => {
        requestingFlows.current = false;
        setLoadingMoreFlows(false);
      });
  }

  const apolloClient = useApolloClient();
  const viewedId = screenshot?.id;
  useEffect(() => {
    if (!viewedId) return;
    void apolloClient
      .mutate({
        mutation: TrackVisualScreenshotViewDocument,
        variables: { id: viewedId },
      })
      .catch((error: unknown) => console.error('Failed to track screenshot view', error));
  }, [apolloClient, viewedId]);
  const status = screenshot ? 'loaded' : primary.loading ? 'loading' : primary.error ? 'error' : 'not-found';
  let relatedStatus: RelatedDetailState['relatedStatus'] = 'loaded';
  if (!screenshot || (related.loading && !related.data)) {
    relatedStatus = 'loading';
  } else if (related.error) {
    relatedStatus = 'error';
  }
  const flows = normalizeDetailFlows(flowPage?.edges.map(edge => edge.node) ?? []);
  const siblingConnection = related.data?.visualScreenshots;
  const siblings = filterSiblingScreenshots(siblingConnection?.edges ?? [], id, VISUAL_SCREENSHOT_DETAIL_RELATED_SIZE);
  return {
    status,
    detail: screenshot
      ? {
          id: screenshot.id,
          imageUrl: screenshot.imageUrl,
          imageAlt: screenshot.imageAlt,
          title: screenshot.title ?? null,
          platform: screenshot.platform ?? null,
          screenType: screenshot.screenType ?? null,
          product: {
            id: screenshot.product.id,
            name: screenshot.product.name,
            slug: screenshot.product.slug,
            summary: screenshot.product.summary ?? null,
            logoUrl: screenshot.product.logoUrl,
          },
          flows,
          relatedScreenshots: siblings,
          relatedScreenshotTotalCount: siblingDisplayTotalCount(siblingConnection?.totalCount ?? 0),
        }
      : null,
    retry: () => {
      void primary.refetch().catch(() => {});
    },
    relatedStatus,
    hasMoreFlows: Boolean(after),
    loadingMoreFlows,
    loadMoreFlowsError,
    loadMoreFlows,
    retryRelated: () => {
      void related.refetch().catch(() => {});
    },
  };
}
