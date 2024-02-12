'use client';

import { bind } from '@croco/utils-structure-react';
import { VStack } from '@kuma-ui/core';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products }) => (
  <VStack>
    {products.map(product => (
      <div key={product.id}>{product.name}</div>
    ))}
  </VStack>
));
