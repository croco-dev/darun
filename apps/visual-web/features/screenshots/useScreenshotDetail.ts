'use client';

import { useApolloClient } from '@apollo/client/react';
import { VisualScreenshotOnDetailDocument } from '@darun/provider-graphql';
import type { VisualPlatform, VisualScreenType } from '@darun/provider-graphql';
import { useEffect, useState } from 'react';

export type ScreenshotDetailData = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  title: string | null;
  platform: VisualPlatform | null;
  screenType: VisualScreenType | null;
  product: { id: string; name: string; slug: string; summary: string | null; logoUrl: string };
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
      .then(result => {
        if (!active) {
          return;
        }
        const screenshot = result.data?.visualScreenshot ?? null;
        if (screenshot === null) {
          setQueryState({ status: 'not-found' });
          return;
        }
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
          },
        });
      })
      .catch(() => {
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
