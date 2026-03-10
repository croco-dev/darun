'use client';

import { AuthProvider } from '@darun/provider-auth/client';
import { ApolloProvider } from '@darun/utils-apollo-client/client';
import { MantineProvider } from '@mantine/core';
import { useCookies } from 'next-client-cookies';
import { ReactNode } from 'react';
import { container } from './container';

export const ClientRootProvider = ({ children }: { children: ReactNode }) => {
  const cookies = useCookies();

  return (
    <ApolloProvider makeClient={() => container.apolloClient} cookies={cookies}>
      <AuthProvider authService={container.authService} cookies={cookies}>
        <MantineProvider>{children}</MantineProvider>
      </AuthProvider>
    </ApolloProvider>
  );
};
