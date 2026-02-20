"use client";

import { ApolloLink } from "@apollo/client";
import { NormalizedCacheObject } from "@apollo/client/cache/inmemory/types";
import {
  ApolloClient,
  ApolloNextAppProvider,
} from "@apollo/experimental-nextjs-app-support";
import { setContext } from "@apollo/client/link/context";
import { Cookies } from "next-client-cookies";
import { ReactNode } from "react";

type ApolloProviderProps = {
  cookies: Cookies;
  children: ReactNode;
  makeClient: () => ApolloClient<NormalizedCacheObject>;
};

export function ApolloProvider({
  cookies,
  children,
  makeClient,
}: ApolloProviderProps) {
  const clientFactory = () => {
    const client = makeClient();

    const authLink = setContext((_, { headers }) => {
      const token = cookies.get("idToken");
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

  return (
    <ApolloNextAppProvider makeClient={clientFactory}>
      {children}
    </ApolloNextAppProvider>
  );
}
