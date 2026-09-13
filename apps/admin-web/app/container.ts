import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { ErrorLink } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { FirebaseAuthService } from '@darun/utils-auth-service-firebase';

const httpErrorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    error.errors.forEach(({ message, locations, path, extensions }) => {
      const locationText = locations?.map(location => `${location.line}:${location.column}`).join(', ') ?? '-';
      const pathText = path?.join('.') ?? '-';
      const code = extensions?.['code'] ? ` [code: ${extensions['code']}]` : '';

      console.error(`[GraphQL error]${code} ${message} | location=${locationText} | path=${pathText}`);
    });

    return;
  }

  const serverError = error as { statusCode?: number; result?: unknown; message?: string };
  if (serverError?.statusCode || serverError?.result) {
    console.error(
      `[Server error HTTP ${serverError.statusCode ?? 'unknown'}]:`,
      serverError.result ?? serverError.message,
      '\nFull error:',
      error
    );
    return;
  }

  console.error(`[Network error]:`, error);
});

const httpLink = new BatchHttpLink({
  uri: process.env['NEXT_PUBLIC_GRAPHQL_URL'] ?? '',
  credentials: 'include',
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
        max: 5,
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
  apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'] ?? '',
});

export const createAuthService = () =>
  new FirebaseAuthService({
    projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] ?? 'darun-io',
    authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'] ?? 'darun-io.firebaseapp.com',
    privateKey: process.env['FIREBASE_PRIVATE_KEY'] ?? '',
    clientEmail: process.env['FIREBASE_CLIENT_EMAIL'] ?? '',
    apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'] ?? '',
  });

export const container = {
  authService,
  httpLink,
  apolloClient,
  createAuthService,
};
