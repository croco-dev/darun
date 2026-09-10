'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';

import { useProductTableOfContent } from './useProductTableOfContent';

export const ProductTableOfContent = bind(useProductTableOfContent, ({ headings, activeHeadingId }) => (
  <div className="flex gap-1 overflow-x-auto py-2.5 scrollbar-hide md:gap-2" role="tablist" aria-label="상세 섹션 목차">
    {headings.map(({ id, text }) => (
      <Button
        key={id}
        role="tab"
        aria-selected={activeHeadingId === id}
        kind={activeHeadingId === id ? 'textActive' : 'text'}
        size="sm"
        className={
          activeHeadingId === id
            ? 'font-bold text-dark-950 bg-white border-dark-150 shadow-xs hover:bg-white'
            : 'text-dark-600 transition-colors hover:text-dark-900'
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
));
