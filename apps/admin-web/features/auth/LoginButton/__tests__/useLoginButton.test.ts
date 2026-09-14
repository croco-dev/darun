import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignInWithGoogle = vi.fn();
const mockSetRedirectUrl = vi.fn();
const mockShowNotification = vi.fn();

let mockIsAuthStateLoading = false;

vi.mock('@darun/provider-auth/client', () => ({
  useAuthState: () => ({ isLoading: mockIsAuthStateLoading }),
  useAuthService: () => ({
    signInWithGoogle: mockSignInWithGoogle,
    setRedirectUrl: mockSetRedirectUrl,
  }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: (...args: unknown[]) => mockShowNotification(...args),
  },
}));

import { useLoginButton } from '../useLoginButton';

describe('useLoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthStateLoading = false;
  });

  it('negative control: initializes with isLoading: false when auth state is not loading', () => {
    const { result } = renderHook(() => useLoginButton());
    expect(result.current.isLoading).toBe(false);
  });

  it('reflects isLoading: true when useAuthState is loading', () => {
    mockIsAuthStateLoading = true;
    const { result } = renderHook(() => useLoginButton());
    expect(result.current.isLoading).toBe(true);
  });

  it('sets redirect URL and calls signInWithGoogle successfully', async () => {
    mockSignInWithGoogle.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLoginButton());

    await act(async () => {
      await result.current.login();
    });

    expect(mockSetRedirectUrl).toHaveBeenCalledWith('/');
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('prevents synchronous double-clicks while login is in-flight', async () => {
    let resolveLogin: () => void;
    mockSignInWithGoogle.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveLogin = () => resolve(undefined);
        })
    );

    const { result } = renderHook(() => useLoginButton());

    let p1: Promise<void>;
    let p2: Promise<void>;
    act(() => {
      p1 = result.current.login();
      p2 = result.current.login();
    });

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveLogin!();
      await Promise.all([p1, p2]);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('shows notification on failure and resets isLoading: false', async () => {
    mockSignInWithGoogle.mockRejectedValueOnce(new Error('Google auth cancelled'));
    const { result } = renderHook(() => useLoginButton());

    await act(async () => {
      await result.current.login();
    });

    expect(mockShowNotification).toHaveBeenCalledWith({
      title: '로그인 실패',
      message: 'Google auth cancelled',
      color: 'red',
    });
    expect(result.current.isLoading).toBe(false);
  });
});
