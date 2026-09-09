'use client';

import { bind } from '@darun/utils-structure-react';
import { ProductItem } from '../../uis';
import { useProductInformation } from './useProductInformation';

export const ProductInformation = bind(useProductInformation, ({ name, logoUrl, summary, tags }) => (
  <ProductItem
    name={name ?? ''}
    logoUrl={logoUrl}
    summary={summary}
    isHero
    isAlignCenter
    nameAs="h1"
    tagVariant="square"
    tags={tags && tags.map(tag => tag.name)}
  />
));
