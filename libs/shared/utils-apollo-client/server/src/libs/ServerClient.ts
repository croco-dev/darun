import { ApolloClient, ApolloLink } from '@apollo/client';
import { NormalizedCacheObject } from '@apollo/client/cache/inmemory/types';
import { setContext } from '@apollo/client/link/context';
import { registerApolloClient } from '@apollo/experimental-nextjs-app-support/rsc';
import { getCookies } from 'next-client-cookies/server';

let clientFactory: { getClient: () => ApolloClient<NormalizedCacheObject> };

export const initApolloClient = (makeClient: () => ApolloClient<NormalizedCacheObject>) => {
  clientFactory = registerApolloClient(makeClient);
};

export const getClient = () => {
  if (!clientFactory) {
    throw new Error('Apollo client not initialized');
  }
  const client = clientFactory.getClient();

  const authLink = setContext((_, { headers }) => {
    const token = getCookies().get('idToken');
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
