'use client';

import { AuthProvider } from '@darun/provider-auth';
import { ApolloProvider } from '@darun/utils-apollo-client';
import { ReactNode } from 'react';
import { container } from './container';

export const ClientRootProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ApolloProvider makeClient={() => container.apolloClient}>
      <AuthProvider authService={container.authService}>{children}</AuthProvider>
    </ApolloProvider>
  );
};
