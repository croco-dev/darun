'use client';

import { bind } from '@croco/utils-structure-react';
import { TextButton } from '@darun/ui-foundation';
import { HStack } from '@kuma-ui/core';

import { useProductTableOfContent } from './useProductTableOfContent';

export const ProductTableOfContent = bind(useProductTableOfContent, ({ headings, activeHeadingId }) => (
  <HStack py={'8px'} gap={['2px', '4px']} overflowX="auto">
    {headings.map(({ id, text }, i) => (
      <TextButton
        key={i}
        isActive={activeHeadingId === id}
        onClick={() => {
          const location = document.getElementById(id)?.offsetTop ?? 0;
          window.scrollTo({ top: location - 40, behavior: 'smooth' });
        }}
      >
        {text}
      </TextButton>
    ))}
  </HStack>
));
