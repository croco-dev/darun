'use client';

import { bind } from '@croco/utils-structure-react';
import { Product } from '@products/uis';
import { useProductSingle } from './useProductSingle';

export const ProductSingle = bind(useProductSingle, ({ name, logoUrl, summary }) => (
  <Product name={name ?? ''} logoUrl={logoUrl} summary={summary} />
));
