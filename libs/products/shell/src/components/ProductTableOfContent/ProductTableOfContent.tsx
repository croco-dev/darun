'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';

import { useProductTableOfContent } from './useProductTableOfContent';

export const ProductTableOfContent = bind(useProductTableOfContent, ({ headings, activeHeadingId }) => {
  const t = useTranslations('ProductDetail');
  const ariaLabel = t('tocAriaLabel');

  const scrollToHeading = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    const location = target.getBoundingClientRect().top + window.scrollY - 124;
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: Math.max(location, 0),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (headings.length === 0) return;
    const currentIndex = headings.findIndex(h => h.id === activeHeadingId);
    let targetIndex = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % headings.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + headings.length) % headings.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIndex = headings.length - 1;
    }

    if (targetIndex >= 0) {
      const targetHeading = headings[targetIndex];
      const tabButton = document.getElementById(`tab-${targetHeading.id}`);
      tabButton?.focus();
      scrollToHeading(targetHeading.id);
    }
  };

  return (
    <div
      className="flex gap-1 overflow-x-auto px-1 py-2 scrollbar-hide scroll-smooth scroll-pl-1 sm:gap-1.5 touch-pan-x rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {headings.map(({ id, text }) => (
        <Button
          key={id}
          id={`tab-${id}`}
          role="tab"
          aria-selected={activeHeadingId === id}
          aria-controls={id}
          tabIndex={activeHeadingId === id ? 0 : -1}
          kind={activeHeadingId === id ? 'textActive' : 'text'}
          size="sm"
          className={
            activeHeadingId === id
              ? 'whitespace-nowrap rounded-full border border-dark-900 bg-dark-900 px-3.5 py-1 text-xs sm:text-sm font-bold text-white shadow-2xs transition-colors duration-150'
              : 'whitespace-nowrap rounded-full border border-transparent px-3.5 py-1 text-xs sm:text-sm font-semibold text-dark-600 transition-colors duration-150 hover:bg-surface-100 hover:text-dark-900'
          }
          onClick={() => scrollToHeading(id)}
        >
          {text}
        </Button>
      ))}
    </div>
  );
});
