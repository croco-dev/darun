import { AuthService, AuthStorage, AuthUser } from '@darun/utils-auth-service-core';
import { signInWithRedirect } from '@firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onIdTokenChanged } from 'firebase/auth';
import { getFirebaseAuth } from 'next-firebase-auth-edge';

type FirebaseAuthConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  authDomain: string;
  apiKey: string;
};

export class FirebaseAuthService implements AuthService {
  private authMethods: ReturnType<typeof getFirebaseAuth>;
  private authStorage?: AuthStorage;

  constructor({ projectId, privateKey, clientEmail, authDomain, apiKey }: FirebaseAuthConfig) {
    this.authMethods = getFirebaseAuth(
      {
        projectId,
        clientEmail,
        privateKey,
      },
      apiKey
    );
    if (typeof window !== 'undefined' && getApps().length === 0) {
      initializeApp({
        apiKey,
        authDomain,
        projectId,
      });
    }
  }

  setRedirectUrl(url: string): void {
    this.authStorage?.set({ redirectUrl: url });
  }

  getRedirectUrl(): string | undefined {
    return this.authStorage?.get('redirectUrl') ?? undefined;
  }
  clearRedirectUrl() {
    this.authStorage?.set({ redirectUrl: undefined });
  }

  async signOut() {
    this.authStorage?.clear();
    await getAuth().signOut();
  }

  setAuthStorage(storage: AuthStorage): void {
    this.authStorage = storage;
  }

  public async getUser() {
    const idToken = this.authStorage?.get('idToken');
    const refreshToken = this.authStorage?.get('refreshToken');
    if (!idToken || !refreshToken) {
      return null;
    }
    const result = await this.authMethods.verifyAndRefreshExpiredIdToken(idToken, refreshToken);
    if (!result) {
      return null;
    }

    this.authStorage?.set({
      idToken: result.token,
    });

    return {
      id: result.decodedToken.uid,
      email: result.decodedToken.email ?? '',
      isAdmin: result.decodedToken.roles?.includes('admin') ?? false,
    };
  }

  public onIdTokenChanged(handler: (user?: AuthUser) => void) {
    const unsubscribe = onIdTokenChanged(getAuth(), async user => {
      if (!user) {
        this.authStorage?.clear();
        handler(undefined);
        return;
      }

      const idToken = await user.getIdTokenResult(false);
      const roles = (idToken.claims.roles ?? []) as string[];
      handler({ id: user.uid, email: user.email ?? '', isAdmin: roles.includes('admin') ?? false });

      this.authStorage?.set({
        idToken: idToken.token,
        refreshToken: user.refreshToken,
      });
    });

    return () => unsubscribe();
  }

  public signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    return signInWithRedirect(getAuth(), provider);
  }
}
