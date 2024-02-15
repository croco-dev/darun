'use client';

import { bind } from '@croco/utils-structure-react';
import { Text, VStack } from '@kuma-ui/core';
import { useProductSummary } from './useProductSummary';

export const ProductSummary = bind(useProductSummary, ({ name }) => (
  <VStack>
    <Text>{name}</Text>
  </VStack>
));
