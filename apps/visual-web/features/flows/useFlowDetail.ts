'use client';

import { useApolloClient } from '@apollo/client/react';
import { VisualFlowOnDetailDocument } from '@darun/provider-graphql';
import type { VisualFlowType, VisualPlatform } from '@darun/provider-graphql';
import { useEffect, useState } from 'react';

export type FlowDetailStep = {
  position: number;
  caption: string;
  screenshot: { id: string; imageUrl: string; imageAlt: string; title: string | null };
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
};

export type FlowDetailState = {
  status: 'loading' | 'not-found' | 'error' | 'loaded';
  detail: FlowDetailData | null;
  retry: () => void;
};

export function useFlowDetail(id: string): FlowDetailState {
  const apolloClient = useApolloClient();
  const [queryState, setQueryState] = useState<
    { status: 'loading' } | { status: 'not-found' } | { status: 'error' } | { status: 'loaded'; detail: FlowDetailData }
  >({ status: 'loading' });
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 재시도 시 로딩 상태 리셋에 필요
    setQueryState({ status: 'loading' });

    apolloClient
      .query({
        query: VisualFlowOnDetailDocument,
        variables: { id },
        fetchPolicy: 'no-cache',
      })
      .then(result => {
        if (!active) {
          return;
        }
        const flow = result.data?.visualFlow ?? null;
        if (flow === null) {
          setQueryState({ status: 'not-found' });
          return;
        }
        setQueryState({
          status: 'loaded',
          detail: {
            id: flow.id,
            title: flow.title ?? '',
            description: flow.description ?? '',
            platform: (flow.platform ?? 'WEB') as VisualPlatform,
            flowType: (flow.flowType ?? 'OTHER') as VisualFlowType,
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
    retry: () => setRequestKey(key => key + 1),
  };
}
