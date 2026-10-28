import { AuthService, AuthStorage, AuthUser } from '@darun/utils-auth-service-core';
import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onIdTokenChanged, signInWithPopup, connectAuthEmulator } from 'firebase/auth';
import { getFirebaseAuth } from 'next-firebase-auth-edge';

let isEmulatorConnected = false;

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
  private authHandlers = new Set<(user?: AuthUser) => void>();
  private unsubscribeAuth?: () => void;
  private authRevision = 0;
  private signOutsInFlight = 0;
  private latestAuthResult?: { user?: AuthUser };

  constructor({ projectId, privateKey, clientEmail, authDomain, apiKey }: FirebaseAuthConfig) {
    const normalizedPrivateKey = privateKey.replace(/\\n/g, '\n');

    this.authMethods = getFirebaseAuth(
      {
        projectId,
        clientEmail,
        privateKey: normalizedPrivateKey,
      },
      apiKey
    );
    this.apiKey = apiKey;

    if (typeof window !== 'undefined') {
      if (getApps().length === 0) {
        initializeApp({
          apiKey,
          authDomain,
          projectId,
        });
      }

      if (process.env['NEXT_PUBLIC_INFRA_ENV'] === 'local' && !isEmulatorConnected) {
        connectAuthEmulator(getAuth(), 'http://localhost:9099');
        isEmulatorConnected = true;
      }
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
    // Invalidate before clearing cookies, including the interval before Firebase emits null.
    this.authRevision++;
    this.latestAuthResult = undefined;
    this.signOutsInFlight++;
    try {
      this.authStorage?.clear();
      await getAuth().signOut();
    } finally {
      this.signOutsInFlight--;
    }
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

    const tokens =
      (idToken ? await this.authMethods.verifyAndRefreshExpiredIdToken(idToken, refreshToken) : null) ??
      (await this.authMethods.handleTokenRefresh(refreshToken, this.apiKey));

    const { token, decodedToken } = tokens;

    this.authStorage?.set({
      idToken: token,
    });

    return {
      id: decodedToken.uid,
      email: decodedToken.email ?? '',
      isAdmin: (decodedToken.roles?.includes('admin') ?? false) || process.env['NEXT_PUBLIC_INFRA_ENV'] === 'local',
    };
  }

  public onIdTokenChanged(handler: (user?: AuthUser) => void) {
    // One SDK listener gives all consumers the same event order and token result.
    // Each subscription owns its wrapper, even if two consumers pass the same handler.
    const notify = (user?: AuthUser) => handler(user);
    this.authHandlers.add(notify);

    if (!this.unsubscribeAuth) {
      const auth = getAuth();
      this.unsubscribeAuth = onIdTokenChanged(auth, async user => {
        const revision = ++this.authRevision;
        this.latestAuthResult = undefined;
        const isCurrent = () =>
          revision === this.authRevision && this.authHandlers.size > 0 && auth.currentUser === user;

        let authUser: AuthUser | undefined;
        if (user) {
          if (this.signOutsInFlight > 0) return;
          const idToken = await user.getIdTokenResult(false);
          if (!isCurrent() || this.signOutsInFlight > 0) return;

          const roles = (idToken.claims.roles ?? []) as string[];
          authUser = {
            id: user.uid,
            email: user.email ?? '',
            isAdmin: roles.includes('admin') || process.env['NEXT_PUBLIC_INFRA_ENV'] === 'local',
          };
          this.authStorage?.set({
            idToken: idToken.token,
            refreshToken: user.refreshToken,
          });
        } else {
          if (!isCurrent()) return;
          this.authStorage?.set({
            idToken: undefined,
            refreshToken: undefined,
          });
        }

        if (!isCurrent()) return;
        this.latestAuthResult = { user: authUser };
        for (const subscriber of [...this.authHandlers]) {
          if (!isCurrent()) break;
          if (this.authHandlers.has(subscriber)) subscriber(authUser);
        }
      });
    } else if (this.latestAuthResult) {
      notify(this.latestAuthResult.user);
    }

    return () => {
      this.authHandlers.delete(notify);
      if (this.authHandlers.size === 0) {
        this.authRevision++;
        this.latestAuthResult = undefined;
        this.unsubscribeAuth?.();
        this.unsubscribeAuth = undefined;
      }
    };
  }

  public signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    return signInWithPopup(getAuth(), provider);
  }
}
