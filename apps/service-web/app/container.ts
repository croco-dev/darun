import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { ErrorLink } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { FirebaseAuthService } from '@darun/utils-auth-service-firebase';

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

const httpLink = new BatchHttpLink({
  uri: process.env['NEXT_PUBLIC_GRAPHQL_URL'] ?? 'http://localhost:4000/graphql',
  credentials: isLocalEnvironment ? 'omit' : 'include',
  batchMax: 10,
  batchInterval: 20,
});

const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([
    new RetryLink({
      delay: {
        initial: 100,
        jitter: true,
      },
      attempts: {
        max: 2,
      },
    }),
    httpErrorLink,
    httpLink,
  ]),
});

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
  apolloClient,
};
