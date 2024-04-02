import { ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import {
  NextSSRInMemoryCache,
  NextSSRApolloClient,
  SSRMultipartLink,
} from '@apollo/experimental-nextjs-app-support/ssr';
import { createApolloClient } from '@darun/utils-apollo-client/client';
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
    return new HttpLink({
      uri: process.env['NEXT_PUBLIC_GRAPHQL_URL'] ?? '',
      credentials: 'include',
    });
  }
  get serverApolloClient() {
    return createApolloClient([this.httpLink], new InMemoryCache());
  }

  get apolloClient() {
    return new NextSSRApolloClient({
      cache: new NextSSRInMemoryCache(),
      link:
        typeof window === 'undefined'
          ? ApolloLink.from([
              new SSRMultipartLink({
                stripDefer: true,
              }),
              this.httpLink,
            ])
          : this.httpLink,
    });
  }
}

export const container = Container.getInstance();
