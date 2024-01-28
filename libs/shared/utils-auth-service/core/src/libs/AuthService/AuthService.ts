import { AuthStorage } from '../AuthStorage';
import { AuthUser } from '../AuthUser';

export interface AuthService {
  setAuthStorage(storage: AuthStorage): void;
  onIdTokenChanged(handler: (user?: AuthUser) => void): () => void;
  signInWithGoogle(): void;
  getUser(): Promise<AuthUser | null>;
}
