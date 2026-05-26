import { ApolloLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { getCookies } from 'next-client-cookies/server';
import { container } from './serverContainer';

export const getClient = (options?: { static?: boolean }) => {
  const client = container.serverApolloClient;

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
