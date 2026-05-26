'use client';

import { ApolloLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ApolloClient, ApolloNextAppProvider } from '@apollo/client-integration-nextjs';
import { Cookies } from 'next-client-cookies';
import { ReactNode } from 'react';

type ApolloProviderProps = {
  cookies: Cookies;
  children: ReactNode;
  makeClient: () => ApolloClient;
};

export function ApolloProvider({ cookies, children, makeClient }: ApolloProviderProps) {
  const clientFactory = () => {
    const client = makeClient();

    const authLink = new SetContextLink(({ headers }) => {
      const token = cookies.get('idToken');
      return {
        headers: {
          ...headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      };
    });

    client.setLink(ApolloLink.from([authLink, client.link]));
    return client;
  };

  return <ApolloNextAppProvider makeClient={clientFactory}>{children}</ApolloNextAppProvider>;
}
