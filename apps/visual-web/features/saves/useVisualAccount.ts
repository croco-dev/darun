'use client';

import { useAuthService } from '@darun/provider-auth/client';
import { useEffect, useEffectEvent, useState } from 'react';

export function useVisualAccount(onAuthenticatedToken?: () => void) {
  const authService = useAuthService();
  const [account, setAccount] = useState<string | null | undefined>(undefined);
  const notifyAuthenticatedToken = useEffectEvent(() => onAuthenticatedToken?.());
  useEffect(
    () =>
      authService.onIdTokenChanged(
        user => {
          setAccount(user?.id ?? null);
          if (user) notifyAuthenticatedToken();
        },
        () => setAccount(null)
      ),
    [authService]
  );
  return account;
}
