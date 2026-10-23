'use client';

import { useApolloClient } from '@apollo/client/react';
import {
  ToggleVisualFlowSaveDocument,
  ToggleVisualScreenshotSaveDocument,
  VisualFlowSaveStatusDocument,
  VisualScreenshotSaveStatusDocument,
} from '@darun/provider-graphql';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useVisualAccount } from './useVisualAccount';

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
  const account = useVisualAccount();
  const generation = useRef(0);
  const toggling = useRef(false);
  const [saved, setSaved] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [toggleError, setToggleError] = useState(false);
  const [owner, setOwner] = useState({ account, kind, id, enabled });
  if (owner.account !== account || owner.kind !== kind || owner.id !== id || owner.enabled !== enabled) {
    setOwner({ account, kind, id, enabled });
    setSaved(false);
    setIsToggling(false);
    setToggleError(false);
    setNeedsLogin(account === null);
  }

  useEffect(() => {
    const requestGeneration = ++generation.current;
    toggling.current = false;
    if (!account) return;
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
            context: { queryDeduplication: false },
          })
        : apolloClient.query({
            query: VisualFlowSaveStatusDocument,
            variables: { id },
            fetchPolicy: 'no-cache',
            context: { queryDeduplication: false },
          });
    request
      .then(result => {
        if (!active || generation.current !== requestGeneration) return;
        const status =
          kind === 'screenshot'
            ? (result.data as { visualScreenshotSaveStatus?: { saved: boolean } } | undefined)
                ?.visualScreenshotSaveStatus
            : (result.data as { visualFlowSaveStatus?: { saved: boolean } } | undefined)?.visualFlowSaveStatus;
        setSaved(status?.saved ?? false);
        setNeedsLogin(false);
      })
      .catch((e: unknown) => {
        if (!active || generation.current !== requestGeneration) return;
        if (isUnauthorized(e)) {
          setNeedsLogin(true);
          return;
        }
        console.error('Failed to load visual save status', e);
      });
    return () => {
      active = false;
      generation.current += 1;
    };
  }, [apolloClient, kind, id, enabled, account]);

  const toggle = useCallback(() => {
    if (toggling.current || !enabled || !account) {
      return;
    }
    const requestGeneration = generation.current;
    toggling.current = true;
    setIsToggling(true);
    setToggleError(false);
    const request =
      kind === 'screenshot'
        ? apolloClient.mutate({ mutation: ToggleVisualScreenshotSaveDocument, variables: { id } })
        : apolloClient.mutate({ mutation: ToggleVisualFlowSaveDocument, variables: { id } });
    request
      .then(result => {
        if (generation.current !== requestGeneration) return;
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
        if (generation.current !== requestGeneration) return;
        if (isUnauthorized(e)) {
          setNeedsLogin(true);
          return;
        }
        console.error('Failed to toggle visual save', e);
        setToggleError(true);
      })
      .finally(() => {
        if (generation.current !== requestGeneration) return;
        toggling.current = false;
        setIsToggling(false);
      });
  }, [apolloClient, kind, id, enabled, account]);

  const retry = useCallback(() => {
    setToggleError(false);
    toggle();
  }, [toggle]);

  return { saved, isToggling, needsLogin, toggleError, toggle, retry };
}
