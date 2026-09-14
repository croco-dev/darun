import { authChecker } from '@darun/provider-auth/server';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { middleware } from '../middleware';

vi.mock('@darun/provider-auth/server', () => ({
  authChecker: {
    getIsAdmin: vi.fn(),
  },
  initAuthProvider: vi.fn(),
}));

describe('admin-web middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated requests to /auth/login even if _rsc is present', async () => {
    vi.mocked(authChecker.getIsAdmin).mockResolvedValue(false);

    const request = new NextRequest('https://admin.darun.io/settings/llm?_rsc=Q9vt4lWADQDN-vV4');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://admin.darun.io/auth/login');
  });

  it('strips _rsc query parameter and preserves other query parameters on direct browser navigation', async () => {
    vi.mocked(authChecker.getIsAdmin).mockResolvedValue(true);

    const request = new NextRequest('https://admin.darun.io/settings/llm?tab=keys&_rsc=Q9vt4lWADQDN-vV4&sort=asc', {
      headers: {
        accept: 'text/html,application/xhtml+xml',
      },
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://admin.darun.io/settings/llm?tab=keys&sort=asc');
  });

  it('preserves cookies set during auth check on _rsc redirection', async () => {
    vi.mocked(authChecker.getIsAdmin).mockImplementation(async cookies => {
      cookies.set('refreshedToken', 'new-token-value');
      return true;
    });

    const request = new NextRequest('https://admin.darun.io/settings/llm?_rsc=123');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://admin.darun.io/settings/llm');
    expect(response.cookies.get('refreshedToken')?.value).toBe('new-token-value');
  });

  it('does not redirect POST requests even if _rsc parameter is present', async () => {
    vi.mocked(authChecker.getIsAdmin).mockResolvedValue(true);

    const request = new NextRequest('https://admin.darun.io/api/action?_rsc=123', {
      method: 'POST',
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects HEAD requests when _rsc parameter is present without rsc header', async () => {
    vi.mocked(authChecker.getIsAdmin).mockResolvedValue(true);

    const request = new NextRequest('https://admin.darun.io/settings/llm?_rsc=123', {
      method: 'HEAD',
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://admin.darun.io/settings/llm');
  });

  it('preserves _rsc parameter for internal Next.js router requests (with rsc: 1 header)', async () => {
    vi.mocked(authChecker.getIsAdmin).mockResolvedValue(true);

    const request = new NextRequest('https://admin.darun.io/settings/llm?_rsc=Q9vt4lWADQDN-vV4', {
      headers: {
        rsc: '1',
      },
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows authenticated normal requests without redirection', async () => {
    vi.mocked(authChecker.getIsAdmin).mockResolvedValue(true);

    const request = new NextRequest('https://admin.darun.io/settings/llm');
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
