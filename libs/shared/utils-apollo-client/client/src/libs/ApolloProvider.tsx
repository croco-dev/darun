'use client';

import { ApolloLink } from '@apollo/client';
import { NormalizedCacheObject } from '@apollo/client/cache/inmemory/types';
import { setContext } from '@apollo/client/link/context';
import { ApolloNextAppProvider, NextSSRApolloClient } from '@apollo/experimental-nextjs-app-support/ssr';
import { useCookies } from 'next-client-cookies';
import { ReactNode } from 'react';

type ApolloProviderProps = {
  children: ReactNode;
  makeClient: () => NextSSRApolloClient<NormalizedCacheObject>;
};

export function ApolloProvider({ children, makeClient }: ApolloProviderProps) {
  const cookies = useCookies();

  const clientFactory = () => {
    const client = makeClient();

    const authLink = setContext((_, { headers }) => {
      const token = cookies.get('idToken');
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : undefined,
        },
      };
    });

    client.setLink(ApolloLink.from([authLink, client.link]));
    return client;
  };

  return <ApolloNextAppProvider makeClient={clientFactory}>{children}</ApolloNextAppProvider>;
}
