'use client';

import { useAuthService } from '@darun/provider-auth/client';
import { useEffect, useEffectEvent, useState } from 'react';

type VisualAccount = { id: string; email: string };

export function useVisualAccount(onAuthenticatedToken?: () => void) {
  const authService = useAuthService();
  const [account, setAccount] = useState<VisualAccount | null | undefined>(undefined);
  const notifyAuthenticatedToken = useEffectEvent(() => onAuthenticatedToken?.());
  useEffect(
    () =>
      authService.onIdTokenChanged(
        user => {
          setAccount(user ? { id: user.id, email: user.email } : null);
          if (user) notifyAuthenticatedToken();
        },
        () => setAccount(null)
      ),
    [authService]
  );
  return account;
}
