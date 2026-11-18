import type { ApolloServerPlugin } from '@apollo/server';

export const createGraphQLDescriptionPrecondition = (): ApolloServerPlugin => ({
  requestDidStart: async ({ request, contextValue }) => {
    const expectedDescriptionHash = request.extensions?.darunExpectedDescriptionHash;
    if (expectedDescriptionHash !== undefined) Object.assign(contextValue, { expectedDescriptionHash });
  },
});
