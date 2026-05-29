'use client';

import { ApolloClient, ApolloLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ApolloProvider as ReactApolloProvider } from '@apollo/client/react';
import { Cookies } from 'next-client-cookies';
import { ReactNode, useState } from 'react';

type ApolloProviderProps = {
  cookies: Cookies;
  children: ReactNode;
  makeClient: () => ApolloClient;
};

type LinkableApolloClient = ApolloClient & {
  readonly link: ApolloLink;
  setLink(newLink: ApolloLink): void;
};

export function ApolloProvider({ cookies, children, makeClient }: ApolloProviderProps) {
  const [client] = useState(() => {
    const apolloClient = makeClient() as LinkableApolloClient;

    const authLink = new SetContextLink(({ headers }) => {
      const token = cookies.get('idToken');
      return {
        headers: {
          ...headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      };
    });

    apolloClient.setLink(ApolloLink.from([authLink, apolloClient.link]));
    return apolloClient;
  });

  return <ReactApolloProvider client={client}>{children}</ReactApolloProvider>;
}
