import type { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';

export const createGraphQLDescriptionPrecondition = (): ApolloServerPlugin => ({
  requestDidStart: async () => ({
    didResolveOperation: async ({ request, contextValue }) => {
      const expectedDescriptionHash = request.extensions?.darunExpectedDescriptionHash;
      if (expectedDescriptionHash === undefined) return;
      if (
        expectedDescriptionHash !== null &&
        (typeof expectedDescriptionHash !== 'string' || !/^[0-9a-f]{64}$/.test(expectedDescriptionHash))
      ) {
        throw new GraphQLError('상품 소개의 편집 기준이 올바르지 않습니다.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      Object.assign(contextValue, { expectedDescriptionHash });
    },
  }),
});
