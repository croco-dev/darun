'use client';

import { useApolloClient, useQuery } from '@apollo/client/react';
import {
  TrackVisualFlowViewDocument,
  VisualFlowOnDetailDocument,
  VisualSiblingFlowsOnDetailDocument,
} from '@darun/provider-graphql';
import type { VisualFlowType, VisualPlatform } from '@darun/provider-graphql';
import { useEffect } from 'react';
import type { RelatedDetailState } from '../detail/RelatedDetailStatus';
import { VISUAL_FLOW_DETAIL_RELATED_FETCH_SIZE, VISUAL_FLOW_DETAIL_RELATED_SIZE } from './detailDocuments';
import { resolveVisualFlowType, resolveVisualPlatform } from './flowClassifications';
import { filterSiblingFlows, siblingFlowDisplayTotalCount } from './relatedCollections';

export type FlowDetailStep = {
  position: number;
  caption: string;
  screenshot: { id: string; imageUrl: string; imageAlt: string; title: string | null };
};

export type FlowDetailRelatedFlow = {
  id: string;
  title: string;
  stepCount: number;
  coverImageUrl: string;
  coverImageAlt: string;
};

export type FlowDetailData = {
  id: string;
  title: string;
  description: string;
  platform: VisualPlatform;
  flowType: VisualFlowType;
  stepCount: number;
  steps: FlowDetailStep[];
  product: { id: string; name: string; slug: string; summary: string | null; logoUrl: string };
  relatedFlows: FlowDetailRelatedFlow[];
  relatedFlowTotalCount: number;
};

export type InitialFlowDetail = NonNullable<import('@darun/provider-graphql').VisualFlowOnDetailQuery['visualFlow']>;

export type FlowDetailState = RelatedDetailState & {
  status: 'loading' | 'not-found' | 'error' | 'loaded';
  detail: FlowDetailData | null;
  retry: () => void;
};

export function useFlowDetail(id: string, initialDetail?: InitialFlowDetail): FlowDetailState {
  const initial = initialDetail?.id === id ? initialDetail : undefined;
  const primary = useQuery(VisualFlowOnDetailDocument, {
    variables: { id },
    skip: initial !== undefined,
    fetchPolicy: 'no-cache',
  });
  const flow = initial ?? primary.data?.visualFlow;
  const related = useQuery(VisualSiblingFlowsOnDetailDocument, {
    variables: {
      productSlug: flow?.product.slug ?? '',
      first: VISUAL_FLOW_DETAIL_RELATED_FETCH_SIZE,
    },
    skip: !flow,
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
  });
  const apolloClient = useApolloClient();
  const viewedId = flow?.id;
  useEffect(() => {
    if (!viewedId) return;
    void apolloClient
      .mutate({
        mutation: TrackVisualFlowViewDocument,
        variables: { id: viewedId },
      })
      .catch((error: unknown) => console.error('Failed to track flow view', error));
  }, [apolloClient, viewedId]);
  const status = flow ? 'loaded' : primary.loading ? 'loading' : primary.error ? 'error' : 'not-found';
  const relatedStatus = related.loading || !flow ? 'loading' : related.error ? 'error' : 'loaded';
  const relatedFlows = filterSiblingFlows(related.data?.visualFlows.edges ?? [], id, VISUAL_FLOW_DETAIL_RELATED_SIZE);
  return {
    status,
    detail: flow
      ? {
          id: flow.id,
          title: flow.title ?? '',
          description: flow.description ?? '',
          platform: resolveVisualPlatform(flow.platform),
          flowType: resolveVisualFlowType(flow.flowType),
          stepCount: flow.stepCount ?? 0,
          steps: (flow.steps ?? []).flatMap(step =>
            step && step.screenshot
              ? [
                  {
                    position: step.position ?? 0,
                    caption: step.caption ?? '',
                    screenshot: {
                      id: step.screenshot.id,
                      imageUrl: step.screenshot.imageUrl ?? '',
                      imageAlt: step.screenshot.imageAlt ?? '',
                      title: step.screenshot.title ?? null,
                    },
                  },
                ]
              : []
          ),
          product: {
            id: flow.product.id,
            name: flow.product.name ?? '',
            slug: flow.product.slug ?? '',
            summary: flow.product.summary ?? null,
            logoUrl: flow.product.logoUrl ?? '',
          },
          relatedFlows: relatedFlows,
          relatedFlowTotalCount: siblingFlowDisplayTotalCount(related.data?.visualFlows.totalCount ?? 0),
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
