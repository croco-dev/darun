import { AuthService, AuthStorage, AuthUser } from '@darun/utils-auth-service-core';
import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onIdTokenChanged, signInWithRedirect } from 'firebase/auth';
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
  private authStorage: AuthStorage;

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

  setAuthStorage(storage: AuthStorage): void {
    this.authStorage = storage;
  }

  public async getUser() {
    const idToken = this.authStorage.get('idToken');
    const refreshToken = this.authStorage.get('refreshToken');
    if (!idToken || !refreshToken) {
      return null;
    }
    const result = await this.authMethods.verifyAndRefreshExpiredIdToken(idToken, refreshToken);
    if (!result) {
      return null;
    }

    this.authStorage.set({
      idToken: result.token,
    });

    return {
      id: result.decodedToken.uid,
      email: result.decodedToken.email ?? '',
    };
  }

  public onIdTokenChanged(handler: (user?: AuthUser) => void) {
    const unsubscribe = onIdTokenChanged(getAuth(), user => {
      if (!user) {
        this.authStorage.clear();
        handler(undefined);
        return;
      }

      user.getIdToken().then(idToken => {
        this.authStorage.set({
          idToken,
          refreshToken: user.refreshToken,
        });
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
