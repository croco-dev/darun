'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent, MouseEvent } from 'react';

import { useProductTableOfContent } from './useProductTableOfContent';

export const ProductTableOfContent = bind(useProductTableOfContent, ({ headings, activeHeadingId, navigationRef }) => {
  const t = useTranslations('ProductDetail');

  const navigateToHeading = (event: MouseEvent, id: string, href: string) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    if (window.location.hash !== href) {
      window.history.pushState(null, '', href);
    }

    target.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth' });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!(event.target instanceof HTMLAnchorElement)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    const links = Array.from(event.currentTarget.querySelectorAll('a'));
    const currentIndex = links.indexOf(event.target);
    let targetIndex: number;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = (currentIndex + 1) % links.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = (currentIndex - 1 + links.length) % links.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = links.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    links[targetIndex]?.focus();
  };

  return (
    <nav
      ref={navigationRef}
      className="flex gap-1 overflow-x-auto px-1 py-2 scrollbar-hide scroll-smooth motion-reduce:scroll-auto scroll-pl-1 sm:gap-1.5 rounded-xl"
      aria-label={t('tocAriaLabel')}
      onKeyDown={handleKeyDown}
    >
      {headings.map(({ id, text }) => {
        const isActive = activeHeadingId === id;
        const href = `#${encodeURIComponent(id)}`;

        return (
          <Button
            as="a"
            key={id}
            href={href}
            aria-current={isActive ? 'location' : undefined}
            kind={isActive ? 'textActive' : 'text'}
            size="sm"
            className={
              isActive
                ? 'whitespace-nowrap select-none min-h-[44px] sm:min-h-0 rounded-full border border-dark-900 bg-dark-900 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white shadow-2xs transition-all duration-150 active:scale-[0.98] motion-reduce:transform-none'
                : 'whitespace-nowrap select-none min-h-[44px] sm:min-h-0 rounded-full border border-transparent px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-dark-600 transition-all duration-150 hover:bg-surface-100 hover:text-dark-900 active:scale-[0.98] motion-reduce:transform-none'
            }
            onClick={event => navigateToHeading(event, id, href)}
          >
            {text}
          </Button>
        );
      })}
    </nav>
  );
});
