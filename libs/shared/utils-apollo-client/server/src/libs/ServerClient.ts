import { ApolloClient, ApolloLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { registerApolloClient } from '@apollo/client-integration-nextjs';
import { getCookies } from 'next-client-cookies/server';

let clientFactory: { getClient: () => ApolloClient };

export const initApolloClient = (makeClient: () => ApolloClient) => {
  clientFactory = registerApolloClient(makeClient);
};

export const getClient = (options?: { static?: boolean }) => {
  if (!clientFactory) {
    throw new Error('Apollo client not initialized');
  }
  const client = clientFactory.getClient();

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
