'use client';

import { bind } from '@croco/utils-structure-react';
import { Text, VStack } from '@kuma-ui/core';
import { useProductDescription } from './useProductDescription';

export const ProductDescription = bind(useProductDescription, ({ description }) => (
  <VStack>
    <Text whiteSpace="pre-wrap" lineHeight={'1.5'} color={'colors.dark.800'}>
      {description}
    </Text>
  </VStack>
));
