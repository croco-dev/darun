import type { ApolloServerPlugin } from '@apollo/server';

export const createGraphQLDescriptionPrecondition = (): ApolloServerPlugin => ({
  requestDidStart: ({ request, contextValue }) => {
    const expectedDescriptionHash = request.extensions?.darunExpectedDescriptionHash;
    if (expectedDescriptionHash !== undefined) Object.assign(contextValue, { expectedDescriptionHash });
    return Promise.resolve();
  },
});
