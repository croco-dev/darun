'use client';

import { useApolloClient, useQuery } from '@apollo/client/react';
import {
  TrackVisualScreenshotViewDocument,
  VisualScreenshotOnDetailDocument,
  VisualSiblingScreenshotsOnDetailDocument,
} from '@darun/provider-graphql';
import type { VisualPlatform, VisualScreenType } from '@darun/provider-graphql';
import { useEffect } from 'react';
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
  flowTotalCount: number;
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
  const relatedStatus = related.loading || !screenshot ? 'loading' : related.error ? 'error' : 'loaded';
  const flows = normalizeDetailFlows(related.data?.visualScreenshot?.flows ?? []);
  const siblings = filterSiblingScreenshots(
    related.data?.visualScreenshots.edges ?? [],
    id,
    VISUAL_SCREENSHOT_DETAIL_RELATED_SIZE
  );
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
          flowTotalCount: flows.length,
          relatedScreenshots: siblings,
          relatedScreenshotTotalCount: siblingDisplayTotalCount(related.data?.visualScreenshots.totalCount ?? 0),
        }
      : null,
    retry: () => {
      void primary.refetch().catch(() => {});
    },
    relatedStatus,
    retryRelated: () => {
      void related.refetch().catch(() => {});
    },
  };
}
