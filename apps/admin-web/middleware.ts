/* eslint-disable @typescript-eslint/no-explicit-any */
import { authChecker, initAuthProvider } from '@darun/provider-auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { CookieAttributes } from 'next-client-cookies';
import { container } from './app/container';

initAuthProvider({ authService: container.authService });

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isAdmin = await authChecker.getIsAdmin({
    remove(name: string, options?: CookieAttributes): void {
      response.cookies.delete(name);
    },
    set(name: string, value: string, options?: CookieAttributes): void {
      response.cookies.set(name, value, options as any);
    },
    get(name?: string): any {
      return name
        ? request.cookies.get(name)?.value
        : request.cookies.getAll().reduce((acc, cookie) => ({ ...acc, [cookie.name]: cookie.value }), {});
    },
  });

  if (!isAdmin) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
};
