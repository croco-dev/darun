'use client';

import { useApolloClient } from '@apollo/client/react';
import { VisualScreenshotOnDetailDocument, VisualSiblingScreenshotsOnDetailDocument } from '@darun/provider-graphql';
import type { VisualPlatform, VisualScreenType } from '@darun/provider-graphql';
import { useEffect, useState } from 'react';
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
  product: { id: string; name: string; slug: string; summary: string | null; logoUrl: string };
  flows: ScreenshotDetailRelatedFlow[];
  flowTotalCount: number;
  relatedScreenshots: ScreenshotDetailRelatedScreenshot[];
  relatedScreenshotTotalCount: number;
};

export type ScreenshotDetailState = {
  status: 'loading' | 'not-found' | 'error' | 'loaded';
  detail: ScreenshotDetailData | null;
  isImageError: boolean;
  onImageError: () => void;
  retry: () => void;
};

export function useScreenshotDetail(id: string): ScreenshotDetailState {
  const apolloClient = useApolloClient();
  const [queryState, setQueryState] = useState<
    | { status: 'loading' }
    | { status: 'not-found' }
    | { status: 'error' }
    | { status: 'loaded'; detail: ScreenshotDetailData }
  >({ status: 'loading' });
  const [requestKey, setRequestKey] = useState(0);
  const [isImageError, setIsImageError] = useState(false);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 재시도 시 로딩 상태 리셋에 필요
    setQueryState({ status: 'loading' });

    apolloClient
      .query({
        query: VisualScreenshotOnDetailDocument,
        variables: { id },
        fetchPolicy: 'no-cache',
      })
      .then(async result => {
        if (!active) {
          return;
        }
        const screenshot = result.data?.visualScreenshot ?? null;
        if (screenshot === null) {
          setQueryState({ status: 'not-found' });
          return;
        }
        const slug = screenshot.product.slug;
        let siblings: ScreenshotDetailRelatedScreenshot[] = [];
        let siblingTotalCount = 0;
        try {
          const siblingResult = await apolloClient.query({
            query: VisualSiblingScreenshotsOnDetailDocument,
            variables: { productSlug: slug, first: VISUAL_SCREENSHOT_DETAIL_RELATED_FETCH_SIZE },
            fetchPolicy: 'no-cache',
          });
          if (!active) {
            return;
          }
          siblingTotalCount = siblingResult.data?.visualScreenshots.totalCount ?? 0;
          siblings = filterSiblingScreenshots(
            siblingResult.data?.visualScreenshots.edges ?? [],
            screenshot.id,
            VISUAL_SCREENSHOT_DETAIL_RELATED_FETCH_SIZE
          );
        } catch (e: unknown) {
          console.error('Failed to load sibling screenshots', e);
          if (!active) {
            return;
          }
        }
        if (!active) {
          return;
        }
        const flows = normalizeDetailFlows(screenshot.flows ?? []);
        setQueryState({
          status: 'loaded',
          detail: {
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
            relatedScreenshots: siblings.slice(0, VISUAL_SCREENSHOT_DETAIL_RELATED_SIZE),
            relatedScreenshotTotalCount: siblingDisplayTotalCount(siblingTotalCount),
          },
        });
      })
      .catch((e: unknown) => {
        console.error('Failed to load screenshot detail', e);
        if (active) {
          setQueryState({ status: 'error' });
        }
      });

    return () => {
      active = false;
    };
  }, [apolloClient, id, requestKey]);

  return {
    status: queryState.status,
    detail: queryState.status === 'loaded' ? queryState.detail : null,
    isImageError,
    onImageError: () => setIsImageError(true),
    retry: () => {
      setIsImageError(false);
      setRequestKey(key => key + 1);
    },
  };
}
