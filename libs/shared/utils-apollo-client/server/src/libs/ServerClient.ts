import { ApolloClient, ApolloLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { getCookies } from 'next-client-cookies/server';

let clientFactory: () => ApolloClient;

export const initApolloClient = (makeClient: () => ApolloClient) => {
  clientFactory = makeClient;
};

export const getClient = (options?: { static?: boolean }) => {
  if (!clientFactory) {
    throw new Error('Apollo client not initialized');
  }
  const client = clientFactory();

  const authLink = new SetContextLink(({ headers }) => {
    const canUseCookies = !options?.static;
    const token = canUseCookies ? getCookies().get('idToken') : undefined;
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
