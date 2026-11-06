'use client';

import { useAuthService } from '@darun/provider-auth/client';
import { useEffect, useState } from 'react';

export function useVisualAccount() {
  const authService = useAuthService();
  const [account, setAccount] = useState<string | null | undefined>(undefined);
  useEffect(
    () =>
      authService.onIdTokenChanged(
        user => setAccount(user?.id ?? null),
        () => setAccount(null)
      ),
    [authService]
  );
  return account;
}
