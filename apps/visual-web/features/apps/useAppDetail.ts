'use client';

import { useQuery } from '@apollo/client/react';
import { AppCollectionsOnVisualAppsDocument, AppDetailOnVisualAppsDocument } from '@darun/provider-graphql';
import type { RelatedDetailState } from '../detail/RelatedDetailStatus';
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

export type InitialAppDetail = NonNullable<
  import('@darun/provider-graphql').AppDetailOnVisualAppsQuery['productBySlug']
>;

export type AppDetailState = RelatedDetailState & {
  status: 'loading' | 'not-found' | 'error' | 'loaded';
  detail: AppDetailData | null;
  retry: () => void;
};

export function useAppDetail(slug: string, initialDetail?: InitialAppDetail): AppDetailState {
  const initial = initialDetail?.slug === slug ? initialDetail : undefined;
  const primary = useQuery(AppDetailOnVisualAppsDocument, {
    variables: { slug },
    skip: initial !== undefined,
    fetchPolicy: 'no-cache',
  });
  const product = initial ?? primary.data?.productBySlug;
  const related = useQuery(AppCollectionsOnVisualAppsDocument, {
    variables: { productSlug: slug, first: VISUAL_APP_DETAIL_COLLECTION_SIZE },
    skip: !product,
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
  });
  const status = product ? 'loaded' : primary.loading ? 'loading' : primary.error ? 'error' : 'not-found';
  const relatedStatus = related.loading || !product ? 'loading' : related.error ? 'error' : 'loaded';
  const screenshots = (related.data?.visualScreenshots.edges ?? []).flatMap(edge => {
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
  const flows = (related.data?.visualFlows.edges ?? []).flatMap(edge => {
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
  return {
    status,
    detail: product
      ? {
          id: product.id,
          name: product.name,
          slug: product.slug,
          summary: product.summary ?? '',
          description: product.description ?? null,
          logoUrl: product.logoUrl ?? '',
          screenshots,
          screenshotTotalCount: related.data?.visualScreenshots.totalCount ?? screenshots.length,
          flows,
          flowTotalCount: related.data?.visualFlows.totalCount ?? flows.length,
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
