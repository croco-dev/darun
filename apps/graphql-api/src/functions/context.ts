import { GetAccount } from '@darun/accounts-domain';

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
  let cachedAccount: Awaited<ReturnType<GetAccount['execute']>> | undefined = undefined;

  const getAccount = async () => {
    if (cachedAccount !== undefined) return cachedAccount;
    cachedAccount = await getAccountUseCase.execute({
      token: authToken,
    });
    return cachedAccount;
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
      return account?.roles ?? [];
    },
  };
}
