'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';

import { useProductTableOfContent } from './useProductTableOfContent';

export const ProductTableOfContent = bind(useProductTableOfContent, ({ headings, activeHeadingId }) => (
  <div className="flex gap-1 overflow-x-auto py-2.5 scrollbar-hide md:gap-2">
    {headings.map(({ id, text }) => (
      <Button
        key={id}
        kind={activeHeadingId === id ? 'textActive' : 'text'}
        size="sm"
        onClick={() => {
          const target = document.getElementById(id);

          if (!target) {
            return;
          }

          const location = target.getBoundingClientRect().top + window.scrollY - 64;
          window.scrollTo({ top: Math.max(location, 0), behavior: 'smooth' });
        }}
      >
        {text}
      </Button>
    ))}
  </div>
));
