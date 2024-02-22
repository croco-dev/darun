'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { Grid } from '@kuma-ui/core';
import { Product } from '@products/uis';
import { useAlternativeProductList } from './useAlternativeProductList';

export const AlternativeProductList = bind(useAlternativeProductList, ({ products }) => {
  if (!products) return <></>;
  return (
    <Grid width={'100%'} gap={'20px'} gridTemplateColumns="repeat(2, 1fr)">
      {products.map(product => (
        <Link key={product.id} href={`/products/${product.slug}`}>
          <Product
            name={product.name}
            logoUrl={product.logoUrl}
            logoSize={'medium'}
            summary={product.summary}
            tags={product.tags.map(tag => tag.name)}
            specialTags={['🎖️ ‘다른’ 추천 등재']}
          />
        </Link>
      ))}
    </Grid>
  );
});
