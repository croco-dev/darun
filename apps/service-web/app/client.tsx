'use client';

import { AuthProvider } from '@darun/provider-auth/client';
import { ApolloProvider } from '@darun/utils-apollo-client/client';
import { ReactNode } from 'react';
import { container } from './container';

export const ClientRootProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ApolloProvider makeClient={() => container.apolloClient}>
      <AuthProvider authService={container.authService}>{children}</AuthProvider>
    </ApolloProvider>
  );
};
