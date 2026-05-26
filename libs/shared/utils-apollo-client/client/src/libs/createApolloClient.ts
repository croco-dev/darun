import { ApolloCache, ApolloClient, ApolloLink } from '@apollo/client';

export function createApolloClient(links: ApolloLink[], cache: ApolloCache) {
  return new ApolloClient({
    defaultOptions: {},
    cache,
    link: ApolloLink.from(links),
  });
}
