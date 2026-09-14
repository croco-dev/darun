'use client';

import { ApolloClient, ApolloLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ApolloProvider as ReactApolloProvider } from '@apollo/client/react';
import type { Cookies } from 'next-client-cookies';
import React, { ReactNode, useEffect, useState } from 'react';

type ApolloProviderProps = {
  cookies: Cookies;
  children: ReactNode;
  makeClient: () => ApolloClient;
};

const AUTH_LINK_ATTACHED = Symbol.for('@darun/auth-link-attached');
const clientCookiesMap = new WeakMap<ApolloClient, Cookies>();

type LinkableApolloClient = ApolloClient & {
  readonly link: ApolloLink;
  setLink(newLink: ApolloLink): void;
  [AUTH_LINK_ATTACHED]?: boolean;
};

export function ApolloProvider({ cookies, children, makeClient }: ApolloProviderProps) {
  const [client] = useState(() => {
    const apolloClient = makeClient() as LinkableApolloClient;
    clientCookiesMap.set(apolloClient, cookies);

    if (apolloClient[AUTH_LINK_ATTACHED]) {
      return apolloClient;
    }

    const authLink = new SetContextLink(({ headers }) => {
      const currentCookies = clientCookiesMap.get(apolloClient);
      const token = currentCookies?.get('idToken');
      return {
        headers: {
          ...headers,
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };
    });

    apolloClient.setLink(ApolloLink.from([authLink, apolloClient.link]));
    apolloClient[AUTH_LINK_ATTACHED] = true;
    return apolloClient;
  });

  useEffect(() => {
    clientCookiesMap.set(client, cookies);
  }, [client, cookies]);

  return <ReactApolloProvider client={client}>{children}</ReactApolloProvider>;
}
