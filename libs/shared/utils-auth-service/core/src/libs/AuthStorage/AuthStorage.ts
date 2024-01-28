type AuthTokens = { idToken: string; refreshToken: string };

export type AuthStorage = {
  get: (key: keyof AuthTokens) => string | null;
  set: (token: Partial<AuthTokens>) => void;
  clear: () => void;
};
