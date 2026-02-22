'use client';

import { bind } from '@croco/utils-structure-react';
import { TextButton } from '@darun/ui-foundation';
import { HStack } from '@kuma-ui/core';

import { useProductTableOfContent } from './useProductTableOfContent';

export const ProductTableOfContent = bind(useProductTableOfContent, ({ headings, activeHeadingId }) => (
  <HStack py={'8px'} gap={['2px', '4px']} overflowX="auto">
    {headings.map(({ id, text }) => (
      <TextButton
        key={id}
        isActive={activeHeadingId === id}
        onClick={() => {
          const target = document.getElementById(id);

          if (!target) {
            return;
          }

          const location = target.getBoundingClientRect().top + window.scrollY - 40;
          window.scrollTo({ top: Math.max(location, 0), behavior: 'smooth' });
        }}
      >
        {text}
      </TextButton>
    ))}
  </HStack>
));
