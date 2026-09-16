'use client';

import { initPostHog } from '@darun/analytics-client';
import { AuthProvider } from '@darun/provider-auth/client';
import { ToastProvider } from '@darun/ui';
import { MotionProvider } from '@darun/ui-layout';
import { ApolloProvider } from '@darun/utils-apollo-client/client';
import { useCookies } from 'next-client-cookies';
import { useLocale } from 'next-intl';
import { ReactNode } from 'react';

import { container } from './container';

export const ClientRootProvider = ({ children }: { children: ReactNode }) => {
  const cookies = useCookies();
  const locale = useLocale();
  initPostHog();
  return (
    <MotionProvider>
      <ApolloProvider makeClient={() => container.apolloClient} cookies={cookies}>
        <AuthProvider authService={container.authService} cookies={cookies}>
          <ToastProvider closeAriaLabel={locale === 'en' ? 'Close notification' : '알림 닫기'}>
            {children}
          </ToastProvider>
        </AuthProvider>
      </ApolloProvider>
    </MotionProvider>
  );
};
