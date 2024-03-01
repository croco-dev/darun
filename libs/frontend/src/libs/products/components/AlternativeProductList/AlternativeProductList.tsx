'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { Grid } from '@kuma-ui/core';
import { ProductItem } from '@products/uis';
import { useAlternativeProductList } from './useAlternativeProductList';

export const AlternativeProductList = bind(useAlternativeProductList, ({ alternatives }) => {
  return alternatives.length > 0 ? (
    <Grid width={'100%'} gap={'20px'} gridTemplateColumns="repeat(2, 1fr)">
      {alternatives.map(alternative => (
        <Link key={alternative.id} href={`/products/${alternative.slug}`}>
          <ProductItem
            name={alternative.name}
            logoUrl={alternative.logoUrl}
            logoSize={'medium'}
            summary={alternative.summary}
            tags={['asd']}
            specialTags={['🎖️ ‘다른’ 추천 등재']}
          />
        </Link>
      ))}
    </Grid>
  ) : null;
});
