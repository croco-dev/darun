import { ApolloLink } from '@apollo/client';
import type { ApolloClient as CoreApolloClient } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { registerApolloClient } from '@apollo/client-integration-nextjs';
import { getCookies } from 'next-client-cookies/server';
import { container } from './serverContainer';

const { getClient: getBaseClient } = registerApolloClient(() => container.serverApolloClient);

export const getClient = (options?: { static?: boolean }) => {
  const client = getBaseClient() as CoreApolloClient;

  const authLink = new SetContextLink(async ({ headers }) => {
    const canUseCookies = !options?.static;
    const token = canUseCookies ? (await getCookies()).get('idToken') : undefined;
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
