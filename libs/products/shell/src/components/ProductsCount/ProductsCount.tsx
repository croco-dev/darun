'use client';

import { bind } from '@croco/utils-structure-react';
import { Text } from '@kuma-ui/core';
import { useProductsCount } from './useProductsCount';

export const ProductsCount = bind(useProductsCount, ({ count }) => (
  <Text as={'span'} color={'colors.brown.600'}>
    {count}
  </Text>
));
