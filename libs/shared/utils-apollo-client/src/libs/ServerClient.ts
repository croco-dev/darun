import { ApolloClient } from '@apollo/client';
import { NormalizedCacheObject } from '@apollo/client/cache/inmemory/types';
import { registerApolloClient } from '@apollo/experimental-nextjs-app-support/rsc';

let clientFactory: { getClient: () => ApolloClient<NormalizedCacheObject> };

export const initApolloClient = (makeClient: () => ApolloClient<NormalizedCacheObject>) => {
  clientFactory = registerApolloClient(makeClient);
};

export const getClient = () => {
  if (!clientFactory) {
    throw new Error('Apollo client not initialized');
  }
  return clientFactory.getClient();
};
