'use client';

import { useAuthService } from '@darun/provider-auth/client';
import { useCallback, useSyncExternalStore } from 'react';

type AuthService = ReturnType<typeof useAuthService>;
type SignOutAttempt = { accountId: string; status: 'pending' | 'error' };

// A sign-out can finish after navigation. Keep recovery with this app's auth service.
const attempts = new WeakMap<AuthService, SignOutAttempt>();
const listeners = new WeakMap<AuthService, Set<() => void>>();

function publish(authService: AuthService, attempt?: SignOutAttempt) {
  if (attempt) attempts.set(authService, attempt);
  else attempts.delete(authService);
  listeners.get(authService)?.forEach(listener => listener());
}

export function useVisualSignOut() {
  const authService = useAuthService();
  const subscribe = useCallback(
    (listener: () => void) => {
      const subscribers = listeners.get(authService) ?? new Set<() => void>();
      listeners.set(authService, subscribers);
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
        if (!subscribers.size) listeners.delete(authService);
      };
    },
    [authService]
  );
  const attempt = useSyncExternalStore(
    subscribe,
    () => attempts.get(authService),
    () => undefined
  );

  async function signOut(accountId: string) {
    if (attempts.get(authService)?.status === 'pending') return;
    const pending: SignOutAttempt = { accountId, status: 'pending' };
    publish(authService, pending);
    try {
      await authService.signOut();
      publish(authService);
    } catch {
      publish(authService, { accountId, status: 'error' });
    }
  }

  const dismissOtherAccountError = useCallback(
    (accountId: string) => {
      const active = attempts.get(authService);
      if (active?.status === 'error' && active.accountId !== accountId) publish(authService);
    },
    [authService]
  );

  return { attempt, signOut, dismissOtherAccountError };
}
