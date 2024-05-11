'use client';

import { bind } from '@croco/utils-structure-react';
import { TextButton } from '@darun/ui-foundation';
import { HStack } from '@kuma-ui/core';

import { useProductTableOfContent } from './useProductTableOfContent';

export const ProductTableOfContent = bind(useProductTableOfContent, ({ headings, activeHeadingId }) => (
  <HStack py={'8px'} gap={'4px'}>
    {headings.map(({ id, text }, i) => (
      <TextButton key={i} isActive={activeHeadingId === id}>
        {text}
      </TextButton>
    ))}
  </HStack>
));
