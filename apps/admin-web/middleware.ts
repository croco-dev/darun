import { authChecker, initAuthProvider } from '@darun/provider-auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCookies } from 'next-client-cookies/server';
import { container } from './app/container';

initAuthProvider({ authService: container.authService });

export async function middleware(request: NextRequest) {
  const isAdmin = await authChecker.getIsAdmin(getCookies());

  if (!isAdmin) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  return;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
};
