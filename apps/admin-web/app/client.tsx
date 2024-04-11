'use client';

import { AuthProvider } from '@darun/provider-auth/client';
import { ApolloProvider } from '@darun/utils-apollo-client/client';
import { MantineProvider } from '@mantine/core';
import { ReactNode } from 'react';
import { AdditionalMantineProvider } from './_mantine';
import { container } from './container';

export const ClientRootProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ApolloProvider makeClient={() => container.apolloClient}>
      <AuthProvider authService={container.authService}>
        <MantineProvider
          theme={{
            fontFamily: 'Pretendard, sans-serif',
            fontFamilyMonospace: 'Monaco, Courier, monospace',
            headings: { fontFamily: 'Pretendard, sans-serif' },
          }}
        >
          <AdditionalMantineProvider>{children}</AdditionalMantineProvider>
        </MantineProvider>
      </AuthProvider>
    </ApolloProvider>
  );
};
