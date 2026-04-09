import { authChecker, initAuthProvider } from '@darun/provider-auth/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { CookieAttributes, Cookies } from 'next-client-cookies';
import { container } from './app/container';

initAuthProvider({ authService: container.authService });

const DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;

function normalizeSameSite(sameSite?: CookieAttributes['sameSite']): 'strict' | 'lax' | 'none' | undefined {
  if (!sameSite) {
    return undefined;
  }

  const normalized = sameSite.toLowerCase();
  if (normalized === 'strict' || normalized === 'lax' || normalized === 'none') {
    return normalized;
  }

  return undefined;
}

function toExpires(expires?: CookieAttributes['expires']): Date | undefined {
  if (typeof expires === 'number') {
    return new Date(Date.now() + expires * DAY_IN_MILLISECONDS);
  }

  return expires;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  function getCookie(name: string): string | undefined;
  function getCookie(): { [key: string]: string };
  function getCookie(name?: string): string | { [key: string]: string } | undefined {
    if (name) {
      return request.cookies.get(name)?.value;
    }

    return request.cookies.getAll().reduce<{ [key: string]: string }>((acc, cookie) => {
      acc[cookie.name] = cookie.value;
      return acc;
    }, {});
  }

  const cookies: Cookies = {
    remove(name: string, options?: CookieAttributes) {
      response.cookies.delete({
        name,
        domain: options?.domain,
        path: options?.path,
        secure: options?.secure,
        sameSite: normalizeSameSite(options?.sameSite),
      });
    },
    set(name: string, value: string, options?: CookieAttributes) {
      response.cookies.set(name, value, {
        domain: options?.domain,
        expires: toExpires(options?.expires),
        path: options?.path,
        secure: options?.secure,
        sameSite: normalizeSameSite(options?.sameSite),
      });
    },
    get: getCookie,
    toString() {
      return request.cookies.toString();
    },
  };

  const isAdmin = await authChecker.getIsAdmin(cookies);

  if (!isAdmin) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
};
