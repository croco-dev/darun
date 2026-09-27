'use client';

import { bind } from '@darun/utils-structure-react';
import { useLocale } from 'next-intl';
import { useProductsCount } from './useProductsCount';

export const ProductsCount = bind(useProductsCount, ({ count }) => {
  const locale = useLocale();
  return <span className="font-bold tabular-nums text-brown-600">{count?.toLocaleString(locale)}</span>;
});
