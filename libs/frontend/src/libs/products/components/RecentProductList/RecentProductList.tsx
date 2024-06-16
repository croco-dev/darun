'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { Grid } from '@kuma-ui/core';
import { ProductItem } from '@products/uis';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products }) => (
  <Grid width={'100%'} gap={'20px'} gridTemplateColumns={['repeat(1, 1fr)', 'repeat(2, 1fr)']}>
    {products.map(product => (
      <Link key={product.id} href={`/products/${product.slug}`}>
        <ProductItem
          name={product.name}
          logoUrl={product.logoUrl}
          logoSize={'medium'}
          summary={product.summary}
          tags={product.tags.map(tag => tag.name)}
        />
      </Link>
    ))}
  </Grid>
));
