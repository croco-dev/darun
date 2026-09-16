import { GetAccount } from '@darun/accounts-domain';
import { IS_LOCAL } from '../config/environment';

export type GraphQLContext = {
  requestId: string;
  authToken: string | undefined;
  clientIp?: string;
  getUserId: () => Promise<string | undefined>;
  getUserIdOrThrow: () => Promise<string>;
  getRoles: () => Promise<string[]>;
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
        throw new Error('Unauthorized');
      }
      return account.id;
    },
    getRoles: async () => {
      const account = await getAccount();
      if (IS_LOCAL && account) {
        return Array.from(new Set([...(account.roles ?? []), 'admin']));
      }
      return account?.roles ?? [];
    },
  };
}
