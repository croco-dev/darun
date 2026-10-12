'use client';

import { ContentArea, Logo, Search } from '@darun/ui';
import { Link, usePathname, useRouter, useSearchParams } from '@darun/utils-router';
import { FormEvent, ReactNode, Suspense, useCallback, useEffect, useRef } from 'react';
import { VISUAL_NAV_TABS, isTabActive } from './visualNav';

const COMPATIBLE_EXPLORER_ROUTES: Record<string, true> = {
  '/': true,
  '/flows': true,
};
const EXPLORER_SHARED_PARAM_KEYS = ['platform', 'product'] as const;

export function getRetainedNavHref(
  targetHref: string,
  currentPathname: string | null,
  searchParams: URLSearchParams | null
): string {
  if (!searchParams) {
    return targetHref;
  }
  if (targetHref === '/collections' || targetHref.startsWith('/collections/')) {
    return targetHref;
  }

  const nextParams = new URLSearchParams();
  const query = searchParams.get('q');
  if (query && query.trim().length > 0) {
    nextParams.set('q', query.trim());
  }

  const normalizedPathname = currentPathname ? currentPathname.replace(/\/+$/, '') || '/' : null;
  if (normalizedPathname && COMPATIBLE_EXPLORER_ROUTES[targetHref] && COMPATIBLE_EXPLORER_ROUTES[normalizedPathname]) {
    for (const key of EXPLORER_SHARED_PARAM_KEYS) {
      const value = searchParams.get(key);
      if (value && value.trim().length > 0) {
        nextParams.set(key, value.trim());
      }
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `${targetHref}?${queryString}` : targetHref;
}

type NavTabItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: readonly NavTabItem[] = [...VISUAL_NAV_TABS, { href: '/collections', label: '컬렉션' }];

function isNavItemActive(pathname: string | null, href: string) {
  if (href === '/collections') {
    return pathname === '/collections' || (pathname !== null && pathname.startsWith('/collections/'));
  }
  return isTabActive(pathname, href);
}

function VisualHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentQuery = searchParams?.get('q') ?? '';

  const focusSearch = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    } else {
      const input = document.querySelector<HTMLInputElement>('[data-visual-search]');
      input?.focus();
      input?.select();
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusSearch();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [focusSearch]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formQuery = new FormData(event.currentTarget).get('q');
    const trimmed = typeof formQuery === 'string' ? formQuery.trim() : '';
    const targetBasePath =
      pathname && pathname.startsWith('/flows') ? '/flows' : pathname && pathname.startsWith('/apps') ? '/apps' : '/';

    const retainedKeys = ['platform', 'product'];
    if (targetBasePath === '/') {
      retainedKeys.push('screenType');
    }
    if (targetBasePath === '/flows') {
      retainedKeys.push('flowType');
    }
    const nextParams = new URLSearchParams();
    if (searchParams) {
      for (const key of retainedKeys) {
        const value = searchParams.get(key);
        if (value && value.trim().length > 0) {
          nextParams.set(key, value.trim());
        }
      }
    }

    if (trimmed.length > 0) {
      nextParams.set('q', trimmed);
    } else {
      nextParams.delete('q');
    }

    const queryString = nextParams.toString();
    router.push(queryString ? `${targetBasePath}?${queryString}` : targetBasePath);
  };

  const isAppRoute = Boolean(pathname && pathname.startsWith('/apps'));
  const isFlowRoute = Boolean(pathname && pathname.startsWith('/flows'));
  const searchLabel = isAppRoute ? '앱 검색' : isFlowRoute ? '플로우 검색' : '스크린샷 검색';
  const searchPlaceholder = isAppRoute
    ? '어떤 앱을 찾고 있나요?'
    : isFlowRoute
      ? '어떤 플로우를 찾고 있나요?'
      : '제품, 화면, 키워드로 검색하세요.';
  const hasPageSearch = pathname === '/' || pathname === '/apps' || pathname === '/flows';

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 py-2.5 sm:min-h-16 sm:py-2">
      <div className="flex min-w-0 items-center gap-3 sm:gap-8">
        <Link
          href="/"
          aria-label="다른 Visual 홈"
          className="flex shrink-0 items-center gap-2.5 rounded-lg transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          <Logo size={32} title="다른 Visual 홈" />
          <span className="hidden text-base font-bold tracking-tight text-dark-900 select-none sm:inline">
            다른 <span className="font-medium text-dark-600">Visual</span>
          </span>
        </Link>
        <nav aria-label="Visual 탐색" className="flex min-w-0 items-center gap-1">
          {NAV_ITEMS.map(tab => {
            const active = isNavItemActive(pathname, tab.href);
            const href = getRetainedNavHref(tab.href, pathname, searchParams);
            return (
              <Link
                key={tab.href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 ${
                  active ? 'bg-surface-100 text-dark-900' : 'text-dark-600 hover:bg-surface-50 hover:text-dark-900'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {!hasPageSearch && (
        <form
          role="search"
          onSubmit={handleSearchSubmit}
          className="relative flex min-w-0 w-full items-center sm:w-60 md:w-72 lg:w-80"
        >
          <label htmlFor="visual-header-search" className="sr-only">
            {searchLabel}
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-dark-400">
            <Search size={16} aria-hidden="true" />
          </div>
          <input
            ref={searchInputRef}
            key={currentQuery}
            id="visual-header-search"
            data-visual-search
            name="q"
            type="search"
            autoComplete="off"
            defaultValue={currentQuery}
            placeholder={searchPlaceholder}
            className="min-h-11 w-full min-w-0 rounded-xl border border-dark-150 bg-surface-50 py-2 pr-10 pl-9 text-sm text-dark-900 transition-colors placeholder:text-dark-600 hover:border-dark-300 focus:border-dark-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-dark-900/60"
          />
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 hidden items-center rounded border border-dark-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-dark-600 sm:inline-flex"
          >
            ⌘K
          </kbd>
        </form>
      )}
    </div>
  );
}

function VisualHeaderFallback() {
  return (
    <div className="flex w-full items-center py-2.5 sm:min-h-16 sm:py-2">
      <div className="flex min-w-0 items-center gap-3 sm:gap-8">
        <Link
          href="/"
          aria-label="다른 Visual 홈"
          className="flex shrink-0 items-center gap-2.5 rounded-xl transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          <Logo size={32} title="다른 Visual 홈" />
          <span className="hidden text-base font-bold tracking-tight text-dark-900 select-none sm:inline">
            다른 <span className="font-medium text-dark-600">Visual</span>
          </span>
        </Link>
        <nav aria-label="Visual 탐색" className="flex min-w-0 items-center gap-1">
          {NAV_ITEMS.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap text-dark-600 hover:bg-surface-50 hover:text-dark-900"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function VisualLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-dark-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-md focus:ring-2 focus:ring-dark-900/60"
      >
        본문으로 건너뛰기
      </a>
      <header className="sticky top-0 z-40 w-full border-b border-dark-150 bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
          <Suspense fallback={<VisualHeaderFallback />}>
            <VisualHeader />
          </Suspense>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
        {children}
      </main>
      <footer className="mt-8 border-t border-dark-150 bg-white py-6">
        <ContentArea>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-dark-600 break-words [word-break:keep-all]">
              © <span className="tabular-nums">{new Date().getFullYear()}</span> Croco · 다른 Visual은 서비스 화면과
              UX를 소개하는 다른(darun)의 공간입니다.
            </p>
            <a
              href="https://darun.io/ko"
              className="inline-flex min-h-11 items-center rounded-lg text-xs font-semibold text-dark-600 whitespace-nowrap transition-colors duration-150 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 sm:text-sm"
            >
              darun.io 서비스 비교
            </a>
          </div>
        </ContentArea>
      </footer>
    </div>
  );
}
