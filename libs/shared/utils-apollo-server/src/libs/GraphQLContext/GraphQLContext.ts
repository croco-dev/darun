export interface GraphQLContext {
  requestId: string;
  authToken?: string;
  clientIp?: string;
  getUserId: () => Promise<string | undefined>;
  getUserIdOrThrow: () => Promise<string>;
  getRoles: () => Promise<string[]>;
}
