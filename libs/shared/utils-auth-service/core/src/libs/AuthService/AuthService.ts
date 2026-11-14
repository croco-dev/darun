import { AuthStorage } from '../AuthStorage';
import { AuthUser } from '../AuthUser';

export interface AuthService {
  setAuthStorage(storage: AuthStorage): void;
  onIdTokenChanged(handler: (user?: AuthUser) => void, onError?: () => void): () => void;
  retryAuthState(): Promise<void>;
  signInWithGoogle(options?: { selectAccount?: boolean }): Promise<string>;
  getUser(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
  setRedirectUrl(url: string): void;
  getRedirectUrl(): string | undefined;
  clearRedirectUrl(): void;
}
