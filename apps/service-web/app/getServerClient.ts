import { ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { registerApolloClient } from '@apollo/experimental-nextjs-app-support/rsc';
import { getCookies } from 'next-client-cookies/server';
import { container } from './serverContainer';

const { getClient: getBaseClient } = registerApolloClient(() => container.serverApolloClient);

export const getClient = (options?: { static?: boolean }) => {
  const client = getBaseClient();

  const authLink = setContext(async (_, { headers }) => {
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
