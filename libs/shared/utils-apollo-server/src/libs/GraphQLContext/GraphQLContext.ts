export type GraphQLContext = {
  getUserId: () => Promise<string | undefined>;
  getRoles: () => Promise<string[]>;
};
