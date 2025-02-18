export type GraphQLContext = {
  requestId: string;
  authToken?: string;
  getUserId: () => Promise<string | undefined>;
  getUserIdOrThrow: () => Promise<string>;
  getRoles: () => Promise<string[]>;
};
