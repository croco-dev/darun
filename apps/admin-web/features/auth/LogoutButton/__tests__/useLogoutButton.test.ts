import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignOut = vi.fn();
const mockNavigate = vi.fn();
const mockShowNotification = vi.fn();

vi.mock('@darun/provider-auth/client', () => ({
  useAuthService: () => ({
    signOut: mockSignOut,
  }),
}));

vi.mock('@darun/utils-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: (...args: unknown[]) => mockShowNotification(...args),
  },
}));

import { useLogoutButton } from '../useLogoutButton';

describe('useLogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('negative control: initializes with loading: false', () => {
    const { result } = renderHook(() => useLogoutButton());
    expect(result.current.loading).toBe(false);
  });

  it('signs out successfully and navigates to /', async () => {
    mockSignOut.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLogoutButton());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockShowNotification).toHaveBeenCalledWith({
      message: '로그아웃되었습니다.',
      color: 'teal',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(result.current.loading).toBe(false);
  });

  it('prevents synchronous double-clicks while logout is in-flight', async () => {
    let resolveSignOut: () => void;
    mockSignOut.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveSignOut = () => resolve(undefined);
        })
    );

    const { result } = renderHook(() => useLogoutButton());

    let p1: Promise<void>;
    let p2: Promise<void>;
    act(() => {
      p1 = result.current.logout();
      p2 = result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSignOut!();
      await Promise.all([p1, p2]);
    });

    expect(result.current.loading).toBe(false);
  });

  it('shows notification on error and resets loading: false', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Signout failed'));
    const { result } = renderHook(() => useLogoutButton());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockShowNotification).toHaveBeenCalledWith({
      message: '로그아웃에 실패했습니다.',
      color: 'red',
    });
    expect(result.current.loading).toBe(false);
  });
});
