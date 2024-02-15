import { ApolloCache, ApolloClient, ApolloLink } from '@apollo/client';
import { NormalizedCacheObject } from '@apollo/client/cache/inmemory/types';

export function createApolloClient(links: ApolloLink[], cache: ApolloCache<NormalizedCacheObject>) {
  return new ApolloClient({
    defaultOptions: {},
    cache,
    link: ApolloLink.from(links),
  });
}
