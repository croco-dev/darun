'use client';

import { useApolloClient } from '@apollo/client/react';
import {
  ToggleVisualFlowSaveDocument,
  ToggleVisualScreenshotSaveDocument,
  VisualFlowSaveStatusDocument,
  VisualScreenshotSaveStatusDocument,
} from '@darun/provider-graphql';
import { useCallback, useEffect, useState } from 'react';

export type VisualSaveButtonState = {
  saved: boolean;
  isToggling: boolean;
  needsLogin: boolean;
  toggleError: boolean;
  toggle: () => void;
  retry: () => void;
};

function isUnauthorized(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const errors = (error as { graphQLErrors?: Array<{ extensions?: { code?: string } }> }).graphQLErrors;
  return errors?.some(e => e.extensions?.code === 'UNAUTHENTICATED') ?? false;
}

/**
 * M3 저장 버튼 상태. 로그인 필수 — 미인증 시 needsLogin: true.
 * 저장 대상 화면+플로 둘 다 지원(kind별 mutation 분기).
 */
export function useVisualSaveButton(params: {
  kind: 'screenshot' | 'flow';
  id: string;
  enabled: boolean;
}): VisualSaveButtonState {
  const { kind, id, enabled } = params;
  const apolloClient = useApolloClient();
  const [saved, setSaved] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [toggleError, setToggleError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    const request =
      kind === 'screenshot'
        ? apolloClient.query({
            query: VisualScreenshotSaveStatusDocument,
            variables: { id },
            fetchPolicy: 'no-cache',
          })
        : apolloClient.query({ query: VisualFlowSaveStatusDocument, variables: { id }, fetchPolicy: 'no-cache' });
    request
      .then(result => {
        if (!active) {
          return;
        }
        const status =
          kind === 'screenshot'
            ? (result.data as { visualScreenshotSaveStatus?: { saved: boolean } } | undefined)
                ?.visualScreenshotSaveStatus
            : (result.data as { visualFlowSaveStatus?: { saved: boolean } } | undefined)?.visualFlowSaveStatus;
        setSaved(status?.saved ?? false);
        setNeedsLogin(false);
      })
      .catch((e: unknown) => {
        if (!active) {
          return;
        }
        if (isUnauthorized(e)) {
          setNeedsLogin(true);
          return;
        }
        console.error('Failed to load visual save status', e);
      });
    return () => {
      active = false;
    };
  }, [apolloClient, kind, id, enabled]);

  const toggle = useCallback(() => {
    if (isToggling) {
      return;
    }
    setIsToggling(true);
    setToggleError(false);
    const request =
      kind === 'screenshot'
        ? apolloClient.mutate({ mutation: ToggleVisualScreenshotSaveDocument, variables: { id } })
        : apolloClient.mutate({ mutation: ToggleVisualFlowSaveDocument, variables: { id } });
    request
      .then(result => {
        const payload =
          kind === 'screenshot'
            ? (result.data as { toggleVisualScreenshotSave?: { saved: boolean } } | undefined)
                ?.toggleVisualScreenshotSave
            : (result.data as { toggleVisualFlowSave?: { saved: boolean } } | undefined)?.toggleVisualFlowSave;
        if (payload !== null && payload !== undefined) {
          setSaved(payload.saved);
          setNeedsLogin(false);
        }
      })
      .catch((e: unknown) => {
        if (isUnauthorized(e)) {
          setNeedsLogin(true);
          return;
        }
        console.error('Failed to toggle visual save', e);
        setToggleError(true);
      })
      .finally(() => {
        setIsToggling(false);
      });
  }, [apolloClient, kind, id, isToggling]);

  const retry = useCallback(() => {
    setToggleError(false);
    toggle();
  }, [toggle]);

  return { saved, isToggling, needsLogin, toggleError, toggle, retry };
}
