import type { ApolloServerPlugin } from '@apollo/server';
import { GetAccount } from '@darun/accounts-domain';
import { GraphQLError } from 'graphql';

export type GraphQLContext = {
  requestId: string;
  authToken: string | undefined;
  clientIp?: string;
  getUserId: () => Promise<string | undefined>;
  getUserIdOrThrow: () => Promise<string>;
  getRoles: () => Promise<string[]>;
};

// Apollo supplies a separate context for each operation, including operations in one HTTP batch.
export const screenshotRegistrationPlugin: ApolloServerPlugin = {
  async requestDidStart({ request, contextValue }) {
    const screenshotRegistrationId = request.extensions?.['screenshotRegistrationId'];
    if (screenshotRegistrationId !== undefined) Object.assign(contextValue, { screenshotRegistrationId });
  },
};

export function createGraphQLContext({
  requestId,
  authToken,
  clientIp,
  getAccountUseCase,
}: {
  requestId: string;
  authToken: string | undefined;
  clientIp?: string;
  getAccountUseCase: GetAccount;
}): GraphQLContext {
  let cachedAccountPromise: ReturnType<GetAccount['execute']> | undefined;

  const getAccount = async () => {
    if (cachedAccountPromise === undefined) {
      cachedAccountPromise = getAccountUseCase
        .execute({
          token: authToken,
        })
        .catch((err: unknown) => {
          cachedAccountPromise = undefined;
          throw err;
        });
    }
    return cachedAccountPromise;
  };

  return {
    requestId,
    authToken,
    clientIp,
    getUserId: async () => {
      const account = await getAccount();
      return account?.id;
    },
    getUserIdOrThrow: async () => {
      const account = await getAccount();
      if (!account) {
        // GraphQLError carries extensions.code through Apollo's formatError
        // (see createServer.ts), so clients receive code UNAUTHENTICATED
        // instead of a generic internal error.
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      return account.id;
    },
    getRoles: async () => {
      const account = await getAccount();
      if (process.env['INFRA_ENV'] === 'local' && account) {
        return Array.from(new Set([...(account.roles ?? []), 'admin']));
      }
      return account?.roles ?? [];
    },
  };
}
