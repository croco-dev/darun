import type { User } from 'firebase/auth';
import { vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  listeners: new Set<(user: User | null) => Promise<void>>(),
  auth: { currentUser: null as User | null, signOut: vi.fn() },
  signInWithPopup: vi.fn(),
  setCustomParameters: vi.fn(),
}));
vi.mock('firebase/app', () => ({
  getApps: () => [{}],
  initializeApp: vi.fn(),
}));
vi.mock('firebase/auth', () => ({
  getAuth: () => sdk.auth,
  onIdTokenChanged: (_auth: unknown, listener: (user: User | null) => Promise<void>) => {
    sdk.listeners.add(listener);
    return () => sdk.listeners.delete(listener);
  },
  GoogleAuthProvider: class {
    addScope() {}
    setCustomParameters = sdk.setCustomParameters;
  },
  signInWithPopup: sdk.signInWithPopup,
  connectAuthEmulator: vi.fn(),
}));
vi.mock('next-firebase-auth-edge', () => ({ getFirebaseAuth: () => ({}) }));

export { sdk };
