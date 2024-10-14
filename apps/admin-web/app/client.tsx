'use client';

import { AuthProvider } from '@darun/provider-auth/client';
import { ApolloProvider } from '@darun/utils-apollo-client/client';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { useCookies } from 'next-client-cookies';
import { ReactNode } from 'react';
import { container } from './container';

import 'dayjs/locale/ko';

export const ClientRootProvider = ({ children }: { children: ReactNode }) => {
  const cookies = useCookies();
  return (
    <ApolloProvider makeClient={() => container.apolloClient} cookies={cookies}>
      <AuthProvider authService={container.authService} cookies={cookies}>
        <MantineProvider
          theme={{
            fontFamily: 'Pretendard, sans-serif',
            fontFamilyMonospace: 'Monaco, Courier, monospace',
            headings: { fontFamily: 'Pretendard, sans-serif' },
          }}
        >
          <Notifications position={'bottom-right'} limit={5} />
          <DatesProvider settings={{ locale: 'ko' }}>{children}</DatesProvider>
        </MantineProvider>
      </AuthProvider>
    </ApolloProvider>
  );
};
