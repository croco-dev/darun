'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useTranslations } from 'next-intl';

import { useProductTableOfContent } from './useProductTableOfContent';

export const ProductTableOfContent = bind(useProductTableOfContent, ({ headings, activeHeadingId }) => {
  const t = useTranslations('ProductDetail');
  const ariaLabel = t('tocAriaLabel');

  return (
    <div className="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-hide scroll-smooth scroll-pl-1 sm:gap-2 touch-pan-x" role="tablist" aria-label={ariaLabel}>
      {headings.map(({ id, text }) => (
        <Button
          key={id}
          role="tab"
          aria-selected={activeHeadingId === id}
          kind={activeHeadingId === id ? 'textActive' : 'text'}
          size="sm"
          className={
            activeHeadingId === id
              ? 'whitespace-nowrap rounded-full border border-dark-900 bg-dark-900 px-4 py-1.5 text-sm font-bold text-white shadow-xs hover:bg-dark-800 hover:text-white transition-all duration-150'
              : 'whitespace-nowrap rounded-full border border-transparent px-4 py-1.5 text-sm font-semibold text-dark-600 transition-all duration-150 hover:border-dark-150/70 hover:bg-surface-100 hover:text-dark-900 active:scale-95'
          }
          onClick={() => {
            const target = document.getElementById(id);

            if (!target) {
              return;
            }

            const location = target.getBoundingClientRect().top + window.scrollY - 124;
            window.scrollTo({ top: Math.max(location, 0), behavior: 'smooth' });
          }}
        >
          {text}
        </Button>
      ))}
    </div>
  );
});
