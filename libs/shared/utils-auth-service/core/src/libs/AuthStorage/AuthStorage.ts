type AuthStorageType = { idToken: string; refreshToken: string; redirectUrl: string };
type AuthStorageKey = keyof AuthStorageType;

export type AuthStorage = {
  get: (key: AuthStorageKey) => string | null;
  set: (values: Partial<AuthStorageType>) => void;
  clear: () => void;
};
