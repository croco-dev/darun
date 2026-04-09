import { initAuthProvider } from '@darun/provider-auth/server';
import { initApolloClient } from '@darun/utils-apollo-client/server';
import { CookiesProvider } from 'next-client-cookies/server';
import { ReactNode } from 'react';
import { container } from './serverContainer';

initAuthProvider({ authService: container.authService });
initApolloClient(() => container.serverApolloClient);

export const ServerRootProvider = async ({ children }: { children: ReactNode }) => {
  return <CookiesProvider>{children}</CookiesProvider>;
};
