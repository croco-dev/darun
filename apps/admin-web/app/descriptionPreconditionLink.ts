import { ApolloLink } from '@apollo/client';

export const descriptionPreconditionLink = new ApolloLink((operation, forward) => {
  const { darunExpectedDescriptionHash, http } = operation.getContext();
  if (darunExpectedDescriptionHash !== undefined) {
    operation.extensions.darunExpectedDescriptionHash = darunExpectedDescriptionHash;
    operation.setContext({ http: { ...http, includeExtensions: true } });
  }
  return forward(operation);
});
