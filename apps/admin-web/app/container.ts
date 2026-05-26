import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { ErrorLink } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { FirebaseAuthService } from '@darun/utils-auth-service-firebase';
class Container {
  private static instance: Container;
  public static getInstance() {
    Container.instance ??= new Container();

    return Container.instance;
  }

  get authService() {
    return new FirebaseAuthService({
      projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] ?? 'darun-io',
      authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'] ?? 'darun-io.firebaseapp.com',
      privateKey: process.env['FIREBASE_PRIVATE_KEY'] ?? '',
      clientEmail: process.env['FIREBASE_CLIENT_EMAIL'] ?? '',
      apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'] ?? '',
    });
  }

  get httpLink() {
    return new BatchHttpLink({
      uri: process.env['NEXT_PUBLIC_GRAPHQL_URL'] ?? '',
      credentials: 'include',
      batchMax: 10,
      batchInterval: 20,
    });
  }

  get apolloClient() {
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

    return new ApolloClient({
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
        this.httpLink,
      ]),
    });
  }
}

export const container = Container.getInstance();
