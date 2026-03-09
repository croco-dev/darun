import { HttpLink, InMemoryCache } from "@apollo/client";
import { createApolloClient } from "@darun/utils-apollo-client/client";
import { FirebaseAuthService } from "@darun/utils-auth-service-firebase";

export const container = {
  authService: new FirebaseAuthService({
    projectId: process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] ?? "darun-io",
    authDomain:
      process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"] ??
      "darun-io.firebaseapp.com",
    // @ts-expect-error - serviceAccount is not in the type definition but is required
    serviceAccount: {
      projectId: process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] ?? "darun-io",
      privateKey: process.env["FIREBASE_PRIVATE_KEY"] ?? "",
      clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    },
    apiKey: process.env["NEXT_PUBLIC_FIREBASE_API_KEY"] ?? "",
  }),
  serverApolloClient: createApolloClient({
    link: new HttpLink({
      uri: process.env["NEXT_PUBLIC_GRAPHQL_URL"] ?? "",
      credentials: "include",
    }),
    cache: new InMemoryCache(),
  }),
};
