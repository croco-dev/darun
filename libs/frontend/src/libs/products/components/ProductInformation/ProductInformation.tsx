'use client';

import { bind } from '@croco/utils-structure-react';
import { ProductItem } from '@products/uis';
import { useProductInformation } from './useProductInformation';

export const ProductInformation = bind(useProductInformation, ({ name, logoUrl, summary }) => (
  <ProductItem name={name ?? ''} logoUrl={logoUrl} summary={summary} isAlignCenter nameAs="h1" />
));
