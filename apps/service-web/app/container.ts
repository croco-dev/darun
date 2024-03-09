import { ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import {
  NextSSRApolloClient,
  NextSSRInMemoryCache,
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
      projectId: 'darun-io',
      authDomain: 'darun-io.firebaseapp.com',
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

  get baseUrl() {
    return process.env['NEXT_PUBLIC_BASE_URL'] ?? 'localhost:3000';
  }
}

export const container = Container.getInstance();
