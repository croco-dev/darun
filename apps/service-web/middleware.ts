import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { appendVary, negotiateRepresentation } from './lib/seo/accept';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isHeadOrGet = request.method === 'GET' || request.method === 'HEAD';

  // 1. Check for explicit .md sibling requests
  if (isHeadOrGet && pathname.endsWith('.md')) {
    const pathWithoutMd = pathname.slice(0, -3);
    const hasLocalePrefix = routing.locales.some(
      locale => pathWithoutMd === `/${locale}` || pathWithoutMd.startsWith(`/${locale}/`)
    );

    if (!hasLocalePrefix) {
      const url = request.nextUrl.clone();
      url.pathname = `/${routing.defaultLocale}${pathname}`;
      return NextResponse.redirect(url, 301);
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/api/markdown${pathWithoutMd}`;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-darun-sibling-md', '1');

    return NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Enforce locale prefix redirect for document routes
  const hasLocalePrefix = routing.locales.some(
    locale => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (!hasLocalePrefix) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${pathname}`;
    url.search = search;
    return NextResponse.redirect(url, 301);
  }

  // 3. For GET/HEAD requests, perform Accept header content negotiation
  if (isHeadOrGet) {
    const representation = negotiateRepresentation(request.headers.get('accept'));

    if (representation === 'not-acceptable') {
      const headers = new Headers();
      headers.set('Content-Type', 'text/plain; charset=utf-8');
      headers.set('Vary', appendVary(null, 'Accept'));
      return new NextResponse('Not Acceptable', {
        status: 406,
        headers,
      });
    }

    if (representation === 'markdown') {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/api/markdown${pathname}`;
      const response = NextResponse.rewrite(rewriteUrl);
      response.headers.set('Vary', appendVary(response.headers.get('Vary'), 'Accept'));
      return response;
    }
  }

  // 4. Default HTML handling via intlMiddleware
  const requestHeaders = new Headers(request.headers);
  // The layout checks existence before loading boundaries start streaming a 200 response.
  // Overwrite the internal route hint so a caller cannot select another category to check.
  requestHeaders.delete('x-darun-category-slug');
  const categoryPath = /^\/(?:ko|en)\/categories\/([^/]+)\/?$/.exec(pathname);
  if (isHeadOrGet && categoryPath) {
    requestHeaders.set('x-darun-category-slug', categoryPath[1]);
  }
  const response = intlMiddleware(new NextRequest(request, { headers: requestHeaders }));
  if (isHeadOrGet && response) {
    response.headers.set('Vary', appendVary(response.headers.get('Vary'), 'Accept'));
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|.*\\.(?!md$)[^.]+$).*)', '/ko/categories/:slug', '/en/categories/:slug'],
};
