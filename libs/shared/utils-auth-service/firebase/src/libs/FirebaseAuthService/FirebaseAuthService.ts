import { AuthService, AuthStorage, AuthUser } from '@darun/utils-auth-service-core';
import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onIdTokenChanged, signInWithPopup } from 'firebase/auth';
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
  private apiKey: string;

  constructor({ projectId, privateKey, clientEmail, authDomain, apiKey }: FirebaseAuthConfig) {
    this.authMethods = getFirebaseAuth(
      {
        projectId,
        clientEmail,
        privateKey,
      },
      apiKey
    );
    this.apiKey = apiKey;

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
    if (!refreshToken) {
      return null;
    }

    const { token, decodedToken } =
      (await this.authMethods.verifyAndRefreshExpiredIdToken(idToken ?? '', refreshToken)) ??
      (await this.authMethods.handleTokenRefresh(refreshToken, this.apiKey));

    this.authStorage?.set({
      idToken: token,
    });

    return {
      id: decodedToken.uid,
      email: decodedToken.email ?? '',
      isAdmin: decodedToken.roles?.includes('admin') ?? false,
    };
  }

  public onIdTokenChanged(handler: (user?: AuthUser) => void) {
    const unsubscribe = onIdTokenChanged(getAuth(), async user => {
      if (!user) {
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

    return signInWithPopup(getAuth(), provider);
  }
}
