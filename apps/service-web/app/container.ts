import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ErrorLink } from '@apollo/client/link/error';
import { HttpLink } from '@apollo/client/link/http';
import { RetryLink } from '@apollo/client/link/retry';
import { createTimeoutLink, shouldRetryOperation } from '@darun/utils-apollo-client/client';
import { FirebaseAuthService } from '@darun/utils-auth-service-firebase';
import { normalizeLocale, type PublicLocale } from '../lib/seo/url';

const httpErrorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    error.errors.forEach(({ message, locations, path }) => {
      const locationText = locations?.map(location => `${location.line}:${location.column}`).join(', ') ?? '-';
      const pathText = path?.join('.') ?? '-';

      console.error(`[GraphQL error] ${message} | location=${locationText} | path=${pathText}`);
    });

    return;
  }

  console.error(`[Network error]: ${error}`);
});

const isLocalEnvironment = process.env['NEXT_PUBLIC_INFRA_ENV'] === 'local';
const firebaseApiKey = process.env['NEXT_PUBLIC_FIREBASE_API_KEY'];

const httpLink = new HttpLink({
  uri: process.env['NEXT_PUBLIC_GRAPHQL_URL'] ?? 'http://localhost:4000/graphql',
  credentials: isLocalEnvironment ? 'omit' : 'include',
});

function createApolloClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.from([
      new RetryLink({
        delay: {
          initial: 100,
          jitter: true,
        },
        attempts: {
          max: 2,
          retryIf: shouldRetryOperation,
        },
      }),
      httpErrorLink,
      createTimeoutLink(),
      httpLink,
    ]),
  });
}

const apolloClients = new Map<PublicLocale, ApolloClient>();

function getApolloClient(locale: string): ApolloClient {
  const key = normalizeLocale(locale);
  let client = apolloClients.get(key);
  if (!client) {
    client = createApolloClient();
    apolloClients.set(key, client);
  }
  return client;
}

const authService = new FirebaseAuthService({
  projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] ?? 'darun-io',
  authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'] ?? 'darun-io.firebaseapp.com',
  privateKey: process.env['FIREBASE_PRIVATE_KEY'] ?? '',
  clientEmail: process.env['FIREBASE_CLIENT_EMAIL'] ?? '',
  apiKey: firebaseApiKey || 'local-emulator-key',
});

export const container = {
  authService,
  httpLink,
  getApolloClient,
};
