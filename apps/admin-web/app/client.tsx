'use client';

import { ApolloProvider } from '@darun/utils-apollo-client/client';
import { MantineProvider } from '@mantine/core';
import { useCookies } from 'next-client-cookies';
import { ReactNode } from 'react';
import { container } from './container';

export const ClientRootProvider = ({ children }: { children: ReactNode }) => {
  const cookies = useCookies();

  return (
    <ApolloProvider makeClient={() => container.apolloClient} cookies={cookies}>
      <MantineProvider>{children}</MantineProvider>
    </ApolloProvider>
  );
};
