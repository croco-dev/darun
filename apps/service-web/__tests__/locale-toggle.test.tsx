// @vitest-environment jsdom

import { NextIntlClientProvider } from 'next-intl';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleToggle } from '../../../libs/shared/ui-layout/src/LocaleToggle/LocaleToggle';

const router = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  prefetch: vi.fn(),
}));
vi.mock('../../../libs/shared/ui-layout/src/i18n/navigation', () => ({
  useRouter: () => router,
  usePathname: () => window.location.pathname.slice(3) || '/',
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.history.replaceState(null, '', '/');
});

function renderToggle(locale: 'ko' | 'en') {
  act(() =>
    root.render(
      <NextIntlClientProvider locale={locale} messages={{}}>
        <LocaleToggle />
      </NextIntlClientProvider>
    )
  );
}

describe('LocaleToggle URL state', () => {
  it.each([
    ['/ko/search/product?query=Notion', 'ko', '/search/product?query=Notion'],
    [
      '/en/search/product?query=%ED%95%9C%EA%B8%80+%26+notes&tag=ui&tag=ux&empty=#results',
      'en',
      '/search/product?query=%ED%95%9C%EA%B8%80+%26+notes&tag=ui&tag=ux&empty=#results',
    ],
    ['/ko/products/figma-e2e#overview', 'ko', '/products/figma-e2e#overview'],
    ['/en', 'en', '/'],
  ] as const)('preserves the URL state when switching from %s', (url, locale, expected) => {
    window.history.replaceState(null, '', url);
    renderToggle(locale);

    act(() => container.querySelector<HTMLButtonElement>('[aria-checked="false"]')!.click());

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(expected, {
      locale: locale === 'ko' ? 'en' : 'ko',
    });
  });

  it('reads the current query and hash at keyboard activation without adding a history entry', () => {
    window.history.replaceState(null, '', '/ko/search/product?query=old#old');
    renderToggle('ko');
    window.history.replaceState(null, '', '/ko/search/product?query=new%20%26%20value&tag=a&tag=b#new');
    const active = container.querySelector<HTMLButtonElement>('[aria-checked="true"]')!;
    active.focus();
    act(() => active.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/search/product?query=new%20%26%20value&tag=a&tag=b#new', {
      locale: 'en',
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('keeps the active language selected when its button is clicked', () => {
    window.history.replaceState(null, '', '/ko/search/product?query=Notion');
    renderToggle('ko');
    act(() => container.querySelector<HTMLButtonElement>('[aria-checked="true"]')!.click());
    expect(router.replace).not.toHaveBeenCalled();
  });
});
