'use client';

import { bind } from '@darun/utils-structure-react';
import { useProductsCount } from './useProductsCount';

export const ProductsCount = bind(useProductsCount, ({ count }) => (
  <span className="font-bold tabular-nums text-brown-600">{count?.toLocaleString()}</span>
));
