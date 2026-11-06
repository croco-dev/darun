import { AuthService, AuthStorage, AuthUser } from '@darun/utils-auth-service-core';
import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onIdTokenChanged, signInWithPopup, connectAuthEmulator } from 'firebase/auth';
import type { User } from 'firebase/auth';
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
  private authHandlers = new Set<{
    onChange: (user?: AuthUser) => void;
    onError?: () => void;
  }>();
  private unsubscribeAuth?: () => void;
  private authRevision = 0;
  private signOutsInFlight = 0;
  private latestAuthResult?: { status: 'ready'; user?: AuthUser } | { status: 'error' };

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

  public onIdTokenChanged(handler: (user?: AuthUser) => void, onError?: () => void) {
    const subscriber = { onChange: handler, onError };
    this.authHandlers.add(subscriber);

    if (!this.unsubscribeAuth) {
      this.unsubscribeAuth = onIdTokenChanged(getAuth(), user => this.readAuthState(user));
    } else if (this.latestAuthResult?.status === 'error') {
      onError?.();
    } else if (this.latestAuthResult) {
      handler(this.latestAuthResult.user);
    }

    return () => {
      this.authHandlers.delete(subscriber);
      if (this.authHandlers.size === 0) {
        this.authRevision++;
        this.latestAuthResult = undefined;
        this.unsubscribeAuth?.();
        this.unsubscribeAuth = undefined;
      }
    };
  }

  public retryAuthState() {
    return this.readAuthState(getAuth().currentUser);
  }

  private async readAuthState(user: User | null) {
    const revision = ++this.authRevision;
    this.latestAuthResult = undefined;
    const isCurrent = () =>
      revision === this.authRevision && this.authHandlers.size > 0 && getAuth().currentUser === user;

    let authUser: AuthUser | undefined;
    if (user) {
      if (this.signOutsInFlight > 0) return;
      let idToken: Awaited<ReturnType<User['getIdTokenResult']>>;
      try {
        idToken = await user.getIdTokenResult(false);
      } catch {
        if (!isCurrent() || this.signOutsInFlight > 0) return;
        // A failed read is not a signed-out event. Preserve the pending return URL.
        this.authStorage?.set({ idToken: undefined, refreshToken: undefined });
        this.latestAuthResult = { status: 'error' };
        for (const subscriber of [...this.authHandlers]) {
          if (!isCurrent()) break;
          if (this.authHandlers.has(subscriber)) subscriber.onError?.();
        }
        return;
      }
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
      this.authStorage?.set({ idToken: undefined, refreshToken: undefined });
    }

    if (!isCurrent()) return;
    this.latestAuthResult = { status: 'ready', user: authUser };
    for (const subscriber of [...this.authHandlers]) {
      if (!isCurrent()) break;
      if (this.authHandlers.has(subscriber)) subscriber.onChange(authUser);
    }
  }

  public signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    return signInWithPopup(getAuth(), provider);
  }
}
