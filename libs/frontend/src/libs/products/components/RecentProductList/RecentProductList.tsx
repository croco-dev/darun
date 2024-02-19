'use client';

import { bind } from '@croco/utils-structure-react';
import { Grid } from '@kuma-ui/core';
import { ProductItem } from '../ProductItem/ProductItem';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products }) => (
  <Grid width={'100%'} gap={'20px'} gridTemplateColumns="repeat(2, 1fr)">
    {products.map(product => (
      <ProductItem
        key={product.id}
        name={product.name}
        logoUrl={product.logoUrl}
        logoSize={'medium'}
        summary={product.summary}
        tags={product.tags.map(tag => tag.name)}
        specialTags={['🎖️ ‘다른’ 추천 등재']}
      />
    ))}
  </Grid>
));
