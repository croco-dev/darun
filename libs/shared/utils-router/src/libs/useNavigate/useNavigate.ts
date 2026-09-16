'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface NavigateOptions {
  replace?: boolean;
  preventScrollReset?: boolean;
}

export function useNavigate() {
  const router = useRouter();

  return useCallback(
    (to: string, options?: NavigateOptions) => {
      if (options?.replace) {
        router.replace(to, { scroll: !options.preventScrollReset });
      } else {
        router.push(to, { scroll: !options?.preventScrollReset });
      }
    },
    [router]
  );
}
