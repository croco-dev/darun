export type GraphQLContext = {
  requestId: string;
  authToken?: string;
  getUserId: () => Promise<string | undefined>;
  getRoles: () => Promise<string[]>;
};
