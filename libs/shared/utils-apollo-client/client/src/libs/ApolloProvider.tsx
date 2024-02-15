'use client';

import { NormalizedCacheObject } from '@apollo/client/cache/inmemory/types';
import { ApolloNextAppProvider, NextSSRApolloClient } from '@apollo/experimental-nextjs-app-support/ssr';
import { ReactNode } from 'react';

type ApolloProviderProps = {
  children: ReactNode;
  makeClient: () => NextSSRApolloClient<NormalizedCacheObject>;
};

export function ApolloProvider({ children, makeClient }: ApolloProviderProps) {
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>;
}
