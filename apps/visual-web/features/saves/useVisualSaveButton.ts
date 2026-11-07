'use client';

import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient } from '@apollo/client/react';
import {
  SetVisualFlowSaveDocument,
  SetVisualScreenshotSaveDocument,
  VisualFlowSaveStatusDocument,
  VisualScreenshotSaveStatusDocument,
} from '@darun/provider-graphql';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useVisualAccount } from './useVisualAccount';

export type VisualSaveButtonState = {
  saved: boolean;
  status: 'loading' | 'error' | 'ready';
  retryStatus: () => void;
  isToggling: boolean;
  needsLogin: boolean;
  toggleError: boolean;
  toggle: () => void;
  retry: () => void;
};

function isUnauthorized(error: unknown): boolean {
  return CombinedGraphQLErrors.is(error) && error.errors.some(error => error.extensions?.code === 'UNAUTHENTICATED');
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
  const generation = useRef(0);
  const toggling = useRef(false);
  const desiredSaved = useRef<boolean | null>(null);
  const saveRevision = useRef(0);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [isToggling, setIsToggling] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [toggleError, setToggleError] = useState(false);
  const account = useVisualAccount(() => {
    if (needsLogin) {
      setNeedsLogin(false);
      setStatus('loading');
      setStatusAttempt(attempt => attempt + 1);
    }
  });
  const [owner, setOwner] = useState({ account, kind, id, enabled });
  if (owner.account !== account || owner.kind !== kind || owner.id !== id || owner.enabled !== enabled) {
    setOwner({ account, kind, id, enabled });
    setSaved(false);
    setStatus('loading');
    setIsToggling(false);
    setToggleError(false);
    setNeedsLogin(account === null);
  }

  useEffect(() => {
    const requestGeneration = ++generation.current;
    toggling.current = false;
    desiredSaved.current = null;
    const statusRevision = saveRevision.current;
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
        if (!active || generation.current !== requestGeneration || saveRevision.current !== statusRevision) return;
        const status =
          kind === 'screenshot'
            ? (result.data as { visualScreenshotSaveStatus?: { saved: boolean } } | undefined)
                ?.visualScreenshotSaveStatus
            : (result.data as { visualFlowSaveStatus?: { saved: boolean } } | undefined)?.visualFlowSaveStatus;
        if (typeof status?.saved !== 'boolean') throw new Error('Missing visual save status');
        setSaved(status.saved);
        setStatus('ready');
        setNeedsLogin(false);
      })
      .catch((e: unknown) => {
        if (!active || generation.current !== requestGeneration || saveRevision.current !== statusRevision) return;
        if (isUnauthorized(e)) {
          setNeedsLogin(true);
          return;
        }
        console.error('Failed to load visual save status', e);
        setStatus('error');
      });
    return () => {
      active = false;
      generation.current += 1;
    };
  }, [apolloClient, kind, id, enabled, account, statusAttempt]);

  const submit = useCallback(
    (savedGoal: boolean) => {
      if (toggling.current || status !== 'ready' || !enabled || !account) {
        return;
      }
      const requestGeneration = generation.current;
      saveRevision.current += 1;
      desiredSaved.current = savedGoal;
      toggling.current = true;
      setIsToggling(true);
      setToggleError(false);
      const request =
        kind === 'screenshot'
          ? apolloClient.mutate({
              mutation: SetVisualScreenshotSaveDocument,
              variables: { input: { id, saved: savedGoal } },
            })
          : apolloClient.mutate({
              mutation: SetVisualFlowSaveDocument,
              variables: { input: { id, saved: savedGoal } },
            });
      request
        .then(result => {
          if (generation.current !== requestGeneration) return;
          const payload =
            kind === 'screenshot'
              ? (result.data as { setVisualScreenshotSave?: { saved: boolean } } | undefined)?.setVisualScreenshotSave
              : (result.data as { setVisualFlowSave?: { saved: boolean } } | undefined)?.setVisualFlowSave;
          if (payload !== null && payload !== undefined) {
            desiredSaved.current = null;
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
    },
    [apolloClient, kind, id, enabled, account, status]
  );

  const toggle = useCallback(() => {
    submit(desiredSaved.current ?? !saved);
  }, [submit, saved]);

  const retry = useCallback(() => {
    if (desiredSaved.current !== null) submit(desiredSaved.current);
  }, [submit]);

  const retryStatus = useCallback(() => {
    if (status === 'error' && enabled && account) {
      setStatus('loading');
      setStatusAttempt(attempt => attempt + 1);
    }
  }, [status, enabled, account]);

  return {
    saved,
    status,
    retryStatus,
    isToggling,
    needsLogin,
    toggleError,
    toggle,
    retry,
  };
}
